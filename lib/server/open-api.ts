import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { errorResponse } from "./bff";
import { callGatewayWithPat } from "./gateway";
import { isPublicId } from "./ids";
import { readPat } from "./pat";
import { publicUrl } from "./config";

/**
 * 소리 검색 API (/api/open/v1/sounds). 프로필에서 발급한 소리 검색(sounds) 개인 토큰이 있어야 부를 수 있다.
 * 쿠키 세션으로는 열지 않는다. web이 토큰을 Access Token으로 바꿔 게이트웨이 /api/v1/sounds를 부르고,
 * 소리마다 미리 듣기 MP3 주소(audioUrl)와 사이트 상세 주소(pageUrl)를 붙여 돌려준다.
 *
 * - GET /api/open/v1/sounds?q=&kind=&category=&mood=&cursor=&size= : 목록·검색
 * - GET /api/open/v1/sounds/facets : 종류·카테고리·분위기별 개수
 * - GET /api/open/v1/sounds/{id} : 상세와 비슷한 소리
 */

/** 넘기는 검색 조건. 나머지 쿼리는 버린다. */
const QUERY_KEYS = ["q", "kind", "category", "mood", "cursor", "size"];

/** 토큰 하나가 1분에 부를 수 있는 횟수. */
export const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;

type Bucket = { start: number; count: number };
const buckets = new Map<string, Bucket>();

/** 이번 1분 창에서 한 번 더 부를 수 있으면 true. 원문 대신 해시를 키로 둔다. */
function take(token: string, now = Date.now()): boolean {
  const k = createHash("sha256").update(token).digest("hex");
  const bucket = buckets.get(k);
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    if (buckets.size >= MAX_BUCKETS) {
      buckets.clear();
    }
    buckets.set(k, { start: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

/** 테스트용. */
export function clearRateLimit(): void {
  buckets.clear();
}

type Sound = { id: string } & Record<string, unknown>;

function withLinks(sound: Sound): Sound {
  return {
    ...sound,
    audioUrl: publicUrl(`/api/images/sounds/${sound.id}`),
    pageUrl: publicUrl(`/sounds/${sound.id}`),
  };
}

function enrich(path: string[], body: unknown): unknown {
  if (path.length === 0) {
    const page = body as { items?: Sound[] };
    return { ...page, items: (page.items ?? []).map(withLinks) };
  }
  if (path[0] === "facets") {
    return body;
  }
  const detail = body as { sound: Sound; similar?: Sound[] };
  return {
    ...detail,
    sound: withLinks(detail.sound),
    similar: (detail.similar ?? []).map(withLinks),
  };
}

function gatewayPath(request: NextRequest, path: string[]): string | null {
  if (path.length === 0) {
    const query = new URLSearchParams();
    for (const key of QUERY_KEYS) {
      const value = request.nextUrl.searchParams.get(key);
      if (value !== null && value !== "") {
        query.set(key, value);
      }
    }
    const search = query.toString();
    return `/api/v1/sounds${search ? `?${search}` : ""}`;
  }
  if (path.length === 1 && (path[0] === "facets" || isPublicId(path[0]))) {
    return `/api/v1/sounds/${path[0]}`;
  }
  return null;
}

/** 소리 검색 API 한 번. 토큰 확인 → 횟수 제한 → 게이트웨이 → 주소 붙이기. */
export async function openSounds(
  request: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const token = readPat(request);
  if (!token) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "개인 토큰이 필요해요. 프로필 > 개인 토큰에서 '소리 검색' 토큰을 발급해 Authorization: Bearer 토큰 으로 보내 주세요.",
    );
  }
  const target = gatewayPath(request, path);
  if (!target) {
    return errorResponse(404, "NOT_FOUND", "찾을 수 없어요.");
  }
  if (!take(token)) {
    const response = errorResponse(
      429,
      "RATE_LIMITED",
      `토큰 하나로 1분에 ${RATE_LIMIT}번까지 부를 수 있어요.`,
    );
    response.headers.set("retry-after", "60");
    return response;
  }
  const { response } = await callGatewayWithPat(
    target,
    { method: "GET" },
    token,
    "sounds",
  );
  const headers = { "cache-control": "no-store" };
  if (!response.ok) {
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        ...headers,
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  }
  return NextResponse.json(enrich(path, await response.json()), { headers });
}
