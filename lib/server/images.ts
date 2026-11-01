import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, readSession } from "./bff";
import { callGateway } from "./gateway";
import { isPublicId } from "./ids";
import { writeSession } from "./session";

const KINDS = new Set(["posts", "comics"]);

/**
 * 이미지 권한은 content-service가 확인하고 미리 서명된 주소를 준다. web이 그 주소에서 바이트를 받아 그대로 넘긴다.
 * 브라우저에는 저장소 주소가 드러나지 않는다. 로그인하지 않았으면 전체 공개 게시물 이미지만 받을 수 있다.
 */
export async function proxyImage(
  request: NextRequest,
  kind: string,
  id: string,
): Promise<NextResponse> {
  if (!KINDS.has(kind) || !isPublicId(id)) {
    return errorResponse(404, "NOT_FOUND", "찾을 수 없어요.");
  }
  // 세션이 없어도 부른다. 전체 공개 게시물이 아니면 게이트웨이·content-service가 401·404로 답한다.
  const session = readSession(request);
  const size =
    request.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "full";
  const result = await callGateway(
    `/api/v1/${kind}/${id}/image?size=${size}`,
    {},
    session,
  );
  let response: NextResponse;
  if (!result.response.ok) {
    response = new NextResponse(null, { status: result.response.status });
  } else {
    const { url } = (await result.response.json()) as { url: string };
    const image = await fetch(url, { cache: "no-store" });
    response = image.ok
      ? new NextResponse(image.body, {
          status: 200,
          headers: {
            "content-type": image.headers.get("content-type") ?? "image/png",
            "cache-control": "private, max-age=300",
            vary: "Cookie",
          },
        })
      : new NextResponse(null, { status: 502 });
  }
  if (result.session !== undefined) {
    writeSession(response.cookies, result.session);
  }
  return response;
}
