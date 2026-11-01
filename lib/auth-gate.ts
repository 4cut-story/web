/** 로그인 없이 열리는 경로. 나머지 화면은 세션 쿠키가 없으면 로그인으로 보낸다. */
const PUBLIC_PREFIXES = ["/login", "/auth/", "/api/", "/_next/", "/favicon"];

/** 로그인 없이 보는 화면: 첫 화면 포털, 사용자 페이지(/@닉네임), 게시물 상세. */
const PUBLIC_PAGES = [
  /^\/$/,
  /^\/@[^/]+$/,
  /^\/u\/[^/]+$/,
  /^\/users\/[^/]+$/,
  /^\/posts\/[^/]+$/,
];

export function needsLogin(pathname: string, hasSession: boolean): boolean {
  if (hasSession) {
    return false;
  }
  return (
    !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !PUBLIC_PAGES.some((p) => p.test(pathname)) &&
    !/\.[a-z0-9]+$/i.test(pathname)
  );
}

/**
 * 사용자 페이지 주소 /@닉네임을 실제 화면 경로 /u/닉네임으로 바꾼다. 앱 라우터에서 @로 시작하는 폴더는
 * 병렬 경로(slot)라서 주소만 이렇게 바꿔 준다. 해당하지 않으면 null.
 */
export function userPageRewrite(pathname: string): string | null {
  const match = /^\/@([^/]+)\/?$/.exec(pathname);
  return match ? `/u/${match[1]}` : null;
}

/** 경로 조각의 퍼센트 인코딩을 푼다. 잘못된 인코딩이면 그대로 둔다. */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
