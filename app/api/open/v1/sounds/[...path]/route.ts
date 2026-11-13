import type { NextRequest } from "next/server";

import { openSounds } from "@/lib/server/open-api";

type Context = { params: Promise<{ path: string[] }> };

/** 소리 검색 API: 분류별 개수(facets)와 상세({id}). 소리 검색 개인 토큰이 있어야 한다. */
export async function GET(request: NextRequest, { params }: Context) {
  return openSounds(request, (await params).path);
}
