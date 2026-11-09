import { NextResponse, type NextRequest } from "next/server";

import { callAs, errorResponse, readCaller } from "./bff";
import { isPublicId } from "./ids";
import { writeSession } from "./session";

/**
 * 이미지 종류 → 게이트웨이에서 사전 서명 주소를 받는 경로. looks는 캐릭터 모습 그림이다. 게시물·만화는 cast(등장인물 순서)가
 * 있으면 그 인물의 얼굴 그림(캐릭터를 못 찾아 만화 컷에서 잘라 낸 것)이고, panel(컷 번호)이 있으면 라이브 모드 컷 그림(frame=b·c면
 * 움직임 컷의 두 번째 그림)이다. sounds는 그림이 아니라 배경음 미리 듣기 MP3다(같은 방식으로 중계한다).
 */
const SOURCES: Record<string, (id: string, query: string) => string> = {
  posts: (id, query) => `/api/v1/posts/${id}/image?${query}`,
  comics: (id, query) => `/api/v1/comics/${id}/image?${query}`,
  looks: (id) => `/api/v1/characters/looks/${id}/image`,
  sounds: (id) => `/api/v1/sounds/${id}/audio`,
};

/** 캐릭터 그림·얼굴 그림은 거의 바뀌지 않아 더 오래 둔다. */
const MAX_AGE: Record<string, number> = { looks: 3600, sounds: 3600 };
const CAST_MAX_AGE = 3600;

/** 게시물·만화 이미지 쿼리: 얼굴 그림(cast), 라이브 컷 그림(panel, frame), 아니면 크기. 틀린 값은 버린다. */
export function imageQuery(params: URLSearchParams): {
  query: string;
  fixed: boolean;
} {
  const cast = params.get("cast");
  if (cast !== null && /^\d{1,2}$/.test(cast)) {
    return { query: `cast=${cast}`, fixed: true };
  }
  const panel = params.get("panel");
  if (panel !== null && /^([1-9]|10)$/.test(panel)) {
    const f = params.get("frame");
    const frame = f === "b" || f === "c" || f === "depth" ? `&frame=${f}` : "";
    return { query: `panel=${panel}${frame}`, fixed: true };
  }
  return {
    query: `size=${params.get("size") === "thumb" ? "thumb" : "full"}`,
    fixed: false,
  };
}

/**
 * 이미지 권한은 content-service가 확인하고 미리 서명된 주소를 준다. web이 그 주소에서 바이트를 받아 그대로 넘긴다.
 * 브라우저에는 저장소 주소가 드러나지 않는다. 로그인하지 않았으면 전체 공개 게시물 이미지만 받을 수 있다.
 */
export async function proxyImage(
  request: NextRequest,
  kind: string,
  id: string,
): Promise<NextResponse> {
  const source = Object.hasOwn(SOURCES, kind) ? SOURCES[kind] : undefined;
  if (!source || !isPublicId(id)) {
    return errorResponse(404, "NOT_FOUND", "찾을 수 없어요.");
  }
  // 세션이 없어도 부른다. 전체 공개 게시물이 아니면 게이트웨이·content-service가 401·404로 답한다.
  const caller = readCaller(request);
  const { query, fixed } = imageQuery(request.nextUrl.searchParams);
  const result = await callAs(caller, source(id, query));
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
            "cache-control": `private, max-age=${fixed ? CAST_MAX_AGE : (MAX_AGE[kind] ?? 300)}`,
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
