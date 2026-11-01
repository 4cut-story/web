import { NextResponse, type NextRequest } from "next/server";

import { callGateway } from "./gateway";
import {
  openSession,
  SESSION_COOKIE,
  writeSession,
  type Session,
} from "./session";

export function readSession(request: NextRequest): Session | null {
  return openSession(request.cookies.get(SESSION_COOKIE)?.value);
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
  const session = readSession(request);
  if (!session && (init.method ?? "GET") !== "GET") {
    return unauthorized();
  }
  const result = await callGateway(path, init, session);
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
