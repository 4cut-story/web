import { NextResponse } from "next/server";

import { gatewayUrl } from "@/lib/server/config";

/** 로그인 화면이 켜진 로그인 방식을 고를 때 쓴다. 실패하면 빈 목록. */
export async function GET() {
  try {
    const upstream = await fetch(`${gatewayUrl()}/auth/providers`, {
      cache: "no-store",
    });
    if (upstream.ok) {
      return NextResponse.json(await upstream.json());
    }
  } catch {
    // 아래 기본값
  }
  return NextResponse.json({ items: [], devLogin: false });
}
