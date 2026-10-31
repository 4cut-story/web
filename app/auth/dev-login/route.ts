import { NextResponse, type NextRequest } from "next/server";

import { errorResponse } from "@/lib/server/bff";
import { postJson } from "@/lib/server/gateway";
import { exchangeCode } from "@/lib/server/login";

/** 개발용 로그인. auth-service에서 켜져 있을 때만 된다 (운영은 404). */
export async function POST(request: NextRequest) {
  const { nickname } = (await request.json().catch(() => ({}))) as {
    nickname?: string;
  };
  const upstream = await postJson("/auth/dev-login", {
    nickname: nickname ?? "",
  });
  if (!upstream.ok) {
    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  }
  const { code } = (await upstream.json()) as { code: string };
  const response = new NextResponse(null, { status: 204 });
  return (await exchangeCode(code, response))
    ? response
    : errorResponse(
        502,
        "LOGIN_FAILED",
        "로그인하지 못했어요. 잠시 뒤 다시 해 주세요.",
      );
}
