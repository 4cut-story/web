import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, readSession, unauthorized } from "./bff";
import { callGateway } from "./gateway";
import { writeSession } from "./session";

const UUID = /^[0-9a-f-]{36}$/i;

/** 조각 하나의 최대 크기. Ingress 기본 요청 크기(1MB)보다 작게 브라우저가 잘라 보낸다. */
export const MAX_CHUNK_BYTES = 1_000_000;

/**
 * 녹음 조각 하나를 받아 저장소에 올린다. conversation-service에서 조각 올리기 주소를 받고 web이 PUT 한다.
 * 브라우저는 저장소 주소를 모른다.
 */
export async function uploadChunk(
  request: NextRequest,
  id: string,
  index: string,
): Promise<NextResponse> {
  const position = Number(index);
  if (!UUID.test(id) || !Number.isInteger(position) || position < 0) {
    return errorResponse(404, "NOT_FOUND", "찾을 수 없어요.");
  }
  const session = readSession(request);
  if (!session) {
    return unauthorized();
  }
  const contentType = request.headers.get("content-type") ?? "audio/webm";
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CHUNK_BYTES) {
    return errorResponse(
      400,
      "VALIDATION_FAILED",
      "녹음 조각 크기가 맞지 않아요.",
    );
  }
  const result = await callGateway(
    `/api/v1/conversations/${id}/chunks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: position, contentType }),
    },
    session,
  );
  let response: NextResponse;
  if (!result.response.ok) {
    response = new NextResponse(await result.response.arrayBuffer(), {
      status: result.response.status,
      headers: { "content-type": "application/json" },
    });
  } else {
    const { putUrl } = (await result.response.json()) as { putUrl: string };
    const stored = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
    response = stored.ok
      ? new NextResponse(null, { status: 204 })
      : errorResponse(
          502,
          "UPLOAD_FAILED",
          "녹음을 올리지 못했어요. 다시 해 주세요.",
        );
  }
  if (result.session !== undefined) {
    writeSession(response.cookies, result.session);
  }
  return response;
}
