import { NextResponse, type NextRequest } from "next/server";

import { publicUrl } from "@/lib/server/config";
import { exchangeCode, loginError } from "@/lib/server/login";

/** auth-service가 로그인을 마치고 일회용 코드와 함께 보내는 곳. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return loginError("LOGIN_FAILED");
  }
  const response = NextResponse.redirect(publicUrl("/"), 303);
  try {
    return (await exchangeCode(code, response))
      ? response
      : loginError("LOGIN_FAILED");
  } catch {
    return loginError("LOGIN_UNAVAILABLE");
  }
}
