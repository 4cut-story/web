import { gatewayUrl } from "./config";
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

export async function refresh(session: Session): Promise<Session | null> {
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
