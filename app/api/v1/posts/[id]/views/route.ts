import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, readSession } from "@/lib/server/bff";
import { callGateway } from "@/lib/server/gateway";
import { writeSession } from "@/lib/server/session";
import {
  isBot,
  VIEWER_COOKIE,
  viewerCookieOptions,
  viewerKey,
  viewerOf,
} from "@/lib/server/views";

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

type Context = { params: Promise<{ id: string }> };

/**
 * 게시물 상세를 한 번 봤다고 남긴다 (만화별 조회수). 로그인하지 않아도 된다. 방문자 쿠키가 없으면 만들어 주고, 게이트웨이에는 쿠키의
 * 해시만 넘긴다. 봇·크롤러로 보이면 세지 않고 204.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return errorResponse(404, "NOT_FOUND", "찾을 수 없어요.");
  }
  if (isBot(request.headers.get("user-agent"))) {
    return new NextResponse(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    });
  }
  const viewer = viewerOf(request);
  const result = await callGateway(
    `/api/v1/posts/${id}/views`,
    { method: "POST", headers: { "X-Viewer-Key": viewerKey(viewer.id) } },
    readSession(request),
  );
  const headers = new Headers({ "cache-control": "no-store" });
  const type = result.response.headers.get("content-type");
  if (type) {
    headers.set("content-type", type);
  }
  const response = new NextResponse(
    result.response.status === 204 ? null : await result.response.arrayBuffer(),
    { status: result.response.status, headers },
  );
  if (viewer.fresh) {
    response.cookies.set(VIEWER_COOKIE, viewer.id, viewerCookieOptions);
  }
  if (result.session !== undefined) {
    writeSession(response.cookies, result.session);
  }
  return response;
}
