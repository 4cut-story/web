import { NextResponse, type NextRequest } from "next/server";

import { readSession } from "@/lib/server/bff";
import { postJson } from "@/lib/server/gateway";
import { writeSession } from "@/lib/server/session";

/** 로그아웃. Refresh Token을 끊고 쿠키를 지운다. auth-service가 안 돼도 쿠키는 지운다. */
export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (session) {
    await postJson("/auth/logout", {
      refreshToken: session.refreshToken,
    }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204 });
  writeSession(response.cookies, null);
  return response;
}
