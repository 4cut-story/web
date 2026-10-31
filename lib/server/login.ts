import { NextResponse } from "next/server";

import { publicUrl } from "./config";
import { postJson } from "./gateway";
import { fromTokens, writeSession, type TokenPair } from "./session";

/** 일회용 로그인 코드를 토큰 쌍으로 바꿔 세션 쿠키에 담는다. 성공하면 true. */
export async function exchangeCode(
  code: string,
  response: NextResponse,
): Promise<boolean> {
  const upstream = await postJson("/auth/token", { code });
  if (!upstream.ok) {
    return false;
  }
  writeSession(
    response.cookies,
    fromTokens((await upstream.json()) as TokenPair),
  );
  return true;
}

export function loginError(code: string): NextResponse {
  return NextResponse.redirect(publicUrl(`/login?error=${code}`), 303);
}
