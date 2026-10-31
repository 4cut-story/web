import { NextResponse, type NextRequest } from "next/server";

import { gatewayUrl, publicUrl } from "./config";

const PROVIDERS = new Set(["github", "google"]);

/**
 * 공급자 로그인의 시작(/auth/login/*)과 돌아오기(/auth/callback/*)를 auth-service로 그대로 넘긴다.
 * auth-service의 로그인 과정 세션 쿠키(AUTH_LOGIN_SESSION)와 302 Location을 브라우저에 그대로 돌려준다.
 */
export async function forwardOAuth(
  request: NextRequest,
  step: "login" | "callback",
  provider: string,
): Promise<NextResponse> {
  if (!PROVIDERS.has(provider)) {
    return NextResponse.redirect(publicUrl("/login?error=UNKNOWN_PROVIDER"));
  }
  const headers: Record<string, string> = {};
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.cookie = cookie;
  }
  let upstream: Response;
  try {
    upstream = await fetch(
      `${gatewayUrl()}/auth/${step}/${provider}${request.nextUrl.search}`,
      { headers, redirect: "manual", cache: "no-store" },
    );
  } catch {
    return NextResponse.redirect(publicUrl("/login?error=LOGIN_UNAVAILABLE"));
  }
  const location = upstream.headers.get("location");
  if (upstream.status < 300 || upstream.status >= 400 || !location) {
    const code =
      upstream.status === 404 ? "PROVIDER_NOT_CONFIGURED" : "LOGIN_FAILED";
    return NextResponse.redirect(publicUrl(`/login?error=${code}`));
  }
  const response = NextResponse.redirect(location, 302);
  for (const value of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", value);
  }
  return response;
}
