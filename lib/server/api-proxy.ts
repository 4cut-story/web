import type { NextRequest, NextResponse } from "next/server";

import { errorResponse, relay } from "./bff";

/** 브라우저가 web을 거쳐 부를 수 있는 공개 API 첫 경로. 내부 API(/internal)는 열지 않는다. */
const ALLOWED = new Set([
  "me",
  "users",
  "conversations",
  "comics",
  "posts",
  "feed",
  "follows",
  "comments",
]);

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

/** /api/v1/** 요청을 게이트웨이 같은 경로로 넘긴다. */
export async function proxyApi(
  request: NextRequest,
  path: string[],
): Promise<NextResponse> {
  if (!ALLOWED.has(path[0] ?? "") || !path.every((p) => SAFE_SEGMENT.test(p))) {
    return errorResponse(404, "NOT_FOUND", "찾을 수 없어요.");
  }
  const method = request.method;
  const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
  const body = hasBody ? await request.text() : null;
  return relay(request, `/api/v1/${path.join("/")}${request.nextUrl.search}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body || null,
  });
}
