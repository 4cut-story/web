import { NextResponse, type NextRequest } from "next/server";

import { callAs, errorResponse, isSignedIn, readCaller } from "./bff";
import { isPublicId } from "./ids";
import {
  imageCache,
  pickFormat,
  pickWidth,
  transformable,
  transformImage,
} from "./image-transform";
import { writeSession } from "./session";

/**
 * 이미지 종류 → 게이트웨이에서 사전 서명 주소를 받는 경로. looks는 캐릭터 모습 그림이다. 게시물·만화는 cast(등장인물 순서)가
 * 있으면 그 인물의 얼굴 그림(캐릭터를 못 찾아 만화 컷에서 잘라 낸 것)이고, panel(컷 번호)이 있으면 라이브 모드 컷 그림(frame=b·c·d면
 * 움직임 컷의 두 번째 그림, voice=n이면 그 컷 n번째 대사 음성 MP3)이다. sounds는 그림이 아니라 배경음 미리 듣기 MP3다(같은 방식으로 중계한다).
 */
const SOURCES: Record<string, (id: string, query: string) => string> = {
  posts: (id, query) => `/api/v1/posts/${id}/image?${query}`,
  comics: (id, query) => `/api/v1/comics/${id}/image?${query}`,
  looks: (id) => `/api/v1/characters/looks/${id}/image`,
  sounds: (id) => `/api/v1/sounds/${id}/audio`,
};

/** 캐릭터 그림·배경음은 거의 바뀌지 않아 더 오래 둔다. */
const MAX_AGE: Record<string, number> = { looks: 3600, sounds: 3600 };
/** 얼굴 그림·컷 그림·대사 음성·썸네일은 한 번 만들면 같은 주소의 내용이 바뀌지 않아 일주일 둔다. */
export const FIXED_MAX_AGE = 7 * 24 * 3600;

/**
 * 게시물·만화 이미지 쿼리: 얼굴 그림(cast), 라이브 컷 그림(panel, frame), 아니면 크기. 틀린 값은 버린다. fixed면 오래 캐시한다.
 * picture면 그림이라 WebP·폭 줄이기를 한다(대사 음성과 깊이 지도는 그대로 보낸다. 깊이 지도는 값 자체를 읽으므로 손실 압축하지 않는다).
 */
export function imageQuery(params: URLSearchParams): {
  query: string;
  fixed: boolean;
  picture: boolean;
} {
  const cast = params.get("cast");
  if (cast !== null && /^\d{1,2}$/.test(cast)) {
    return { query: `cast=${cast}`, fixed: true, picture: true };
  }
  const panel = params.get("panel");
  if (panel !== null && /^([1-9]|10)$/.test(panel)) {
    // 대사 음성(MP3). 그림과 같은 권한으로 중계한다
    const voice = params.get("voice");
    if (voice !== null && /^[1-9]$/.test(voice)) {
      return {
        query: `panel=${panel}&voice=${voice}`,
        fixed: true,
        picture: false,
      };
    }
    const f = params.get("frame");
    const frame =
      f === "b" || f === "c" || f === "d" || f === "depth" ? `&frame=${f}` : "";
    return {
      query: `panel=${panel}${frame}`,
      fixed: true,
      picture: f !== "depth",
    };
  }
  // 목록 썸네일(첫 컷)은 한 번 만들면 바뀌지 않아 얼굴 그림처럼 오래 둔다.
  const thumb = params.get("size") === "thumb";
  return {
    query: `size=${thumb ? "thumb" : "full"}`,
    fixed: thumb,
    picture: true,
  };
}

/**
 * 캐시 기간과 범위. 로그인하지 않고 받았다면 전체 공개라 누구에게 보여도 되므로 public으로 둔다(앞단 프록시도 들고 있을 수 있다).
 * 로그인한 사람의 응답은 공개 범위를 알 수 없어 private로 둔다.
 */
export function cacheControl(
  kind: string,
  fixed: boolean,
  signedIn: boolean,
): string {
  const maxAge = fixed ? FIXED_MAX_AGE : (MAX_AGE[kind] ?? 300);
  return `${signedIn ? "private" : "public"}, max-age=${maxAge}`;
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
  const params = request.nextUrl.searchParams;
  const parsed = imageQuery(params);
  const { query, fixed } = parsed;
  const picture = parsed.picture && kind !== "sounds";
  const result = await callAs(caller, source(id, query));
  let response: NextResponse;
  if (!result.response.ok) {
    response = new NextResponse(null, { status: result.response.status });
  } else {
    const { url } = (await result.response.json()) as { url: string };
    const width = pickWidth(params.get("w"));
    const format = pickFormat(request.headers.get("accept"));
    const shrink = picture && (width !== null || format === "webp");
    const headers = {
      "cache-control": cacheControl(kind, fixed, isSignedIn(caller)),
      vary: picture ? "Cookie, Accept" : "Cookie",
    };
    response = shrink
      ? await shrunk(url, `${format}:${width ?? ""}`, width, format, headers)
      : await passthrough(url, headers);
  }
  if (result.session !== undefined) {
    writeSession(response.cookies, result.session);
  }
  return response;
}

type Headers = Record<string, string>;

async function passthrough(
  url: string,
  headers: Headers,
): Promise<NextResponse> {
  const image = await fetch(url, { cache: "no-store" });
  return image.ok
    ? new NextResponse(image.body, {
        status: 200,
        headers: {
          "content-type": image.headers.get("content-type") ?? "image/png",
          ...headers,
        },
      })
    : new NextResponse(null, { status: 502 });
}

/**
 * 저장소 원본을 폭·형식에 맞게 바꿔 보낸다. 바꾼 결과는 원본 ETag와 함께 메모리에 두고, 다음에는 If-None-Match로 원본이 그대로인지만
 * 물어 304면 다시 바꾸지 않는다. 권한 확인(사전 서명 주소 받기)은 매번 먼저 하므로 캐시가 권한을 건너뛰지 않는다.
 */
async function shrunk(
  url: string,
  variant: string,
  width: number | null,
  format: ReturnType<typeof pickFormat>,
  headers: Headers,
): Promise<NextResponse> {
  const key = `${new URL(url).pathname}|${variant}`;
  const cached = imageCache.get(key);
  const image = await fetch(url, {
    cache: "no-store",
    headers: cached ? { "if-none-match": cached.etag } : undefined,
  });
  if (image.status === 304 && cached) {
    return send(cached.body, cached.contentType, headers);
  }
  if (!image.ok) {
    return new NextResponse(null, { status: 502 });
  }
  const contentType = image.headers.get("content-type") ?? "image/png";
  const original = new Uint8Array(await image.arrayBuffer());
  if (!transformable(contentType)) {
    return send(original, contentType, headers);
  }
  let out: { body: Uint8Array; contentType: string } | null = null;
  try {
    out = await transformImage(original, width, format);
  } catch {
    // 바꾸지 못하면 아래에서 원본을 그대로 보낸다
  }
  // 바꾼 것이 더 크면(이미 작은 JPEG 등) 원본을 쓴다. 어느 쪽이든 캐시에 두어 다음에 다시 바꿔 보지 않는다
  const chosen =
    out === null || out.body.byteLength >= original.byteLength
      ? { body: original, contentType }
      : out;
  const etag = image.headers.get("etag");
  if (etag) {
    imageCache.set(key, { etag, ...chosen });
  }
  return send(chosen.body, chosen.contentType, headers);
}

function send(
  body: Uint8Array,
  contentType: string,
  headers: Headers,
): NextResponse {
  return new NextResponse(body as BodyInit, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-length": String(body.byteLength),
      ...headers,
    },
  });
}
