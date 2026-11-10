// 서버(/lab 페이지)에서만 import 한다.
import { cacheLife } from "next/cache";
import { connection } from "next/server";

import { loadAllRounds, type Round } from "@/lib/lab";

/**
 * 회차 목록과 방식마다 timing.json·scores.json(100개 넘는 파일)을 서버에서 한 번에 모아 5분 둔다.
 * 브라우저가 GitHub에 파일을 하나씩 따로 묻지 않아도 되고, GitHub API 호출 한도도 서버 한 곳에서만 쓴다.
 */
async function cachedRounds(): Promise<Round[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  return loadAllRounds();
}

/** 빌드 때가 아니라 요청 때 읽는다. 못 받으면 undefined를 돌려 브라우저가 직접 읽게 둔다. */
export async function labRounds(): Promise<Round[] | undefined> {
  await connection();
  return cachedRounds().catch(() => undefined);
}
