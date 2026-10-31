import { NextResponse, type NextRequest } from "next/server";

import { needsLogin } from "@/lib/auth-gate";

const SESSION_COOKIE = "fourcut_session";

/** 세션 쿠키가 없으면 화면 대신 로그인으로 보낸다. 쿠키가 유효한지는 BFF가 게이트웨이를 부를 때 확인한다. */
export function proxy(request: NextRequest) {
  if (
    needsLogin(request.nextUrl.pathname, request.cookies.has(SESSION_COOKIE))
  ) {
    return NextResponse.redirect(
      new URL("/login", process.env.PUBLIC_BASE_URL ?? request.url),
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|auth/).*)"],
};
