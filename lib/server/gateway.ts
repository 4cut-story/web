import { createHash } from "node:crypto";

import { gatewayUrl } from "./config";
import { patExchange, type PatScope } from "./pat";
import { fromTokens, type Session, type TokenPair } from "./session";

export type GatewayResult = {
  response: Response;
  /** 토큰을 새로 받았으면 새 세션, 갱신에 실패해 로그아웃해야 하면 null, 그대로면 undefined. */
  session?: Session | null;
};

type CallInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
};

function send(
  path: string,
  init: CallInit,
  accessToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = { ...init.headers };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetch(gatewayUrl() + path, {
    method: init.method ?? "GET",
    headers,
    body: init.body ?? null,
    redirect: "manual",
    cache: "no-store",
  });
}

/** 게이트웨이에 JSON으로 POST 한다 (토큰 없이 부르는 /auth/** 용). */
export function postJson(path: string, body: unknown): Promise<Response> {
  return send(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Refresh Token → 갱신 결과. 페이지 하나가 이미지·API를 여러 개 한꺼번에 부르면 Access Token이 만료된 순간 갱신이 동시에 여러 번
 * 나갔다. auth-service는 한 번 쓴 Refresh Token이 다시 오면 탈취로 보고 그 로그인을 모두 끊어서, 등장인물 그림이 빠지고 로그인이
 * 풀렸다. 같은 토큰의 갱신은 한 번만 보내고, 끝난 뒤 잠깐(뒤늦게 온 요청이 같은 쿠키를 들고 오는 동안) 결과를 나눠 쓴다.
 */
const refreshing = new Map<
  string,
  { at: number; result: Promise<Session | null> }
>();
const SHARE_MS = 30_000;
const MAX_SHARED = 1000;

function refreshKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 테스트 전용: 나눠 쓰던 갱신 결과를 잊는다. */
export function forgetRefreshes(): void {
  refreshing.clear();
}

export function refresh(session: Session): Promise<Session | null> {
  const key = refreshKey(session.refreshToken);
  const now = Date.now();
  const shared = refreshing.get(key);
  if (shared && now - shared.at < SHARE_MS) {
    return shared.result;
  }
  for (const [k, v] of refreshing) {
    if (now - v.at >= SHARE_MS || refreshing.size >= MAX_SHARED) {
      refreshing.delete(k);
    }
  }
  const result = renew(session).then(
    (renewed) => {
      // 실패는 나눠 쓰지 않는다 (잠깐 게이트웨이가 안 될 때 계속 로그아웃되지 않게)
      if (!renewed) {
        refreshing.delete(key);
      }
      return renewed;
    },
    (error: unknown) => {
      refreshing.delete(key);
      throw error;
    },
  );
  refreshing.set(key, { at: now, result });
  return result;
}

async function renew(session: Session): Promise<Session | null> {
  const response = await postJson("/auth/refresh", {
    refreshToken: session.refreshToken,
  });
  if (!response.ok) {
    return null;
  }
  return fromTokens((await response.json()) as TokenPair);
}

/**
 * 로그인한 사용자로 게이트웨이를 부른다. Access Token이 만료돼 401이 오면 한 번 갱신하고 다시 부른다.
 * 본문은 다시 보낼 수 있게 문자열이나 바이트로만 받는다.
 */
export async function callGateway(
  path: string,
  init: CallInit,
  session: Session | null,
): Promise<GatewayResult> {
  const response = await send(path, init, session?.accessToken);
  if (response.status !== 401 || !session) {
    return { response };
  }
  const renewed = await refresh(session);
  if (!renewed) {
    return { response, session: null };
  }
  return {
    response: await send(path, init, renewed.accessToken),
    session: renewed,
  };
}

function rejected(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

/**
 * 개인 액세스 토큰으로 게이트웨이를 부른다. 토큰의 권한 범위가 scope와 다르면 403.
 * Access Token이 만료돼 401이 오면 한 번 다시 바꿔서 부른다. 세션 쿠키는 만들지 않는다.
 */
export async function callGatewayWithPat(
  path: string,
  init: CallInit,
  token: string,
  scope: PatScope = "publish",
): Promise<GatewayResult> {
  const exchanged = await patExchange(token);
  if (!exchanged) {
    return {
      response: rejected(401, "UNAUTHORIZED", "토큰이 없거나 만료·폐기됐어요."),
    };
  }
  if (exchanged.scope !== scope) {
    return patForbidden(exchanged.scope);
  }
  const response = await send(path, init, exchanged.accessToken);
  if (response.status !== 401) {
    return { response };
  }
  const renewed = await patExchange(token, true);
  return {
    response: renewed ? await send(path, init, renewed.accessToken) : response,
  };
}

/** 토큰으로는 열지 않는 경로. 메시지는 토큰 권한 범위로 고른다. */
export function patForbidden(scope = "publish"): GatewayResult {
  return {
    response: rejected(
      403,
      "FORBIDDEN",
      scope === "sounds"
        ? "소리 검색 토큰으로는 소리 검색 API(/api/open/v1/sounds)만 쓸 수 있어요."
        : "이 토큰으로는 게시에 필요한 기능만 쓸 수 있어요.",
    ),
  };
}
