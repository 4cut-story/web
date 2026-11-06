import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";

import { gatewayUrl } from "./config";

/**
 * 개인 액세스 토큰(게시 전용). 자동화 도구가 쿠키 대신 `Authorization: Bearer fcp_...`로 web을 부른다.
 * web이 auth-service에서 짧은 Access Token으로 바꿔 게이트웨이를 부르고, Access Token은 밖에 내보내지 않는다.
 * 토큰으로는 아래 게시 경로만 열린다. 토큰 관리(/me/tokens), 탈퇴, 삭제, 팔로우·댓글은 열지 않는다.
 */
export const PAT_PREFIX = "fcp_";

type Rule = { methods: string[]; match: (path: string[]) => boolean };

const READ = ["GET"];
const WRITE = ["GET", "POST", "PUT"];

const RULES: Record<string, Rule> = {
  conversations: { methods: WRITE, match: () => true },
  comics: { methods: WRITE, match: () => true },
  posts: { methods: WRITE, match: () => true },
  characters: { methods: READ, match: () => true },
  feed: { methods: READ, match: () => true },
  users: { methods: READ, match: () => true },
  me: { methods: READ, match: (path) => path.length === 1 },
};

/** `/api/v1/**` 경로(첫 조각부터)를 토큰으로 부를 수 있는지. */
export function patAllows(method: string, path: string[]): boolean {
  const rule = Object.hasOwn(RULES, path[0] ?? "") ? RULES[path[0]] : undefined;
  return !!rule && rule.methods.includes(method) && rule.match(path);
}

/** 요청 헤더의 개인 액세스 토큰. 없으면 null. */
export function readPat(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match && match[1].startsWith(PAT_PREFIX) ? match[1] : null;
}

type Cached = { accessToken: string; until: number };

/** 토큰 해시 → 바꾼 Access Token. 만료 1분 전까지 다시 쓴다(원문은 키로 두지 않는다). */
const cache = new Map<string, Cached>();
const MAX_CACHE = 500;
const MARGIN_MS = 60_000;

function key(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Access Token으로 바꾼다. 토큰이 없거나 만료·폐기됐으면 null. fresh면 캐시를 건너뛴다. */
export async function patAccessToken(
  token: string,
  fresh = false,
): Promise<string | null> {
  const k = key(token);
  const hit = cache.get(k);
  if (!fresh && hit && hit.until > Date.now()) {
    return hit.accessToken;
  }
  cache.delete(k);
  const response = await fetch(`${gatewayUrl()}/auth/pat/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    redirect: "manual",
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
  };
  if (cache.size >= MAX_CACHE) {
    cache.clear();
  }
  cache.set(k, {
    accessToken: body.accessToken,
    until: Date.now() + body.expiresIn * 1000 - MARGIN_MS,
  });
  return body.accessToken;
}

/** 테스트용. */
export function clearPatCache(): void {
  cache.clear();
}
