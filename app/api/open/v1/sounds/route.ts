import type { NextRequest } from "next/server";

import { openSounds } from "@/lib/server/open-api";

/** 소리 검색 API: 목록·검색. 소리 검색 개인 토큰이 있어야 한다. */
export async function GET(request: NextRequest) {
  return openSounds(request, []);
}
