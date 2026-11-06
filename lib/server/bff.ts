import { NextResponse, type NextRequest } from "next/server";

import {
  callGateway,
  callGatewayWithPat,
  patForbidden,
  type GatewayResult,
} from "./gateway";
import { patAllows, readPat } from "./pat";
import {
  openSession,
  SESSION_COOKIE,
  writeSession,
  type Session,
} from "./session";

export function readSession(request: NextRequest): Session | null {
  return openSession(request.cookies.get(SESSION_COOKIE)?.value);
}

/** 누가 부르는지: 쿠키 세션이 먼저고, 없으면 개인 액세스 토큰(Authorization 헤더). */
export type Caller = { session: Session | null; pat: string | null };

export function readCaller(request: NextRequest): Caller {
  const session = readSession(request);
  return { session, pat: session ? null : readPat(request) };
}

export function isSignedIn(caller: Caller): boolean {
  return caller.session !== null || caller.pat !== null;
}

/** 게이트웨이 경로를 부른다. 개인 토큰이면 게시에 필요한 경로만 열고 나머지는 403. */
export async function callAs(
  caller: Caller,
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: BodyInit | null;
  } = {},
): Promise<GatewayResult> {
  if (caller.session || !caller.pat) {
    return callGateway(path, init, caller.session);
  }
  const segments = path
    .split("?")[0]
    .replace(/^\/api\/v1\//, "")
    .split("/");
  if (
    !path.startsWith("/api/v1/") ||
    !patAllows(init.method ?? "GET", segments)
  ) {
    return patForbidden();
  }
  return callGatewayWithPat(path, init, caller.pat);
}

/** api-conventions의 오류 본문 모양으로 답한다. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function unauthorized(): NextResponse {
  return errorResponse(401, "UNAUTHORIZED", "로그인이 필요해요.");
}

/**
 * 게이트웨이 응답을 그대로 브라우저에 돌려준다. 토큰이 갱신되었으면 쿠키도 바꾼다.
 * 세션이 없으면 읽기(GET)만 토큰 없이 넘긴다. 로그인 없이 볼 수 있는 경로인지는 게이트웨이가 정한다 (아니면 401).
 */
export async function relay(
  request: NextRequest,
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: BodyInit | null;
  } = {},
): Promise<NextResponse> {
  const caller = readCaller(request);
  if (!isSignedIn(caller) && (init.method ?? "GET") !== "GET") {
    return unauthorized();
  }
  const result = await callAs(caller, path, init);
  const headers = new Headers();
  const type = result.response.headers.get("content-type");
  if (type) {
    headers.set("content-type", type);
  }
  headers.set("cache-control", "no-store");
  const body =
    result.response.status === 204 ? null : await result.response.arrayBuffer();
  const response = new NextResponse(body, {
    status: result.response.status,
    headers,
  });
  if (result.session !== undefined) {
    writeSession(response.cookies, result.session);
  }
  return response;
}
