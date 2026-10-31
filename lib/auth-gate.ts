/** 로그인 없이 열리는 경로. 나머지 화면은 세션 쿠키가 없으면 로그인으로 보낸다. */
const PUBLIC_PREFIXES = ["/login", "/auth/", "/api/", "/_next/", "/favicon"];

export function needsLogin(pathname: string, hasSession: boolean): boolean {
  if (hasSession) {
    return false;
  }
  return (
    !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !/\.[a-z0-9]+$/i.test(pathname)
  );
}
