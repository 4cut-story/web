// 서버(route handler)에서만 import 한다.
import { createHash, randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

/** 조회수 방문자 쿠키. 같은 쿠키로 10분 안에 다시 본 것은 content-service가 세지 않는다. */
export const VIEWER_COOKIE = "fourcut_vid";

const VIEWER_MAX_AGE_SEC = 365 * 24 * 3600;

const COOKIE_VALUE = /^[A-Za-z0-9-]{16,64}$/;

/**
 * 봇·크롤러로 보이는 User-Agent. 검색 엔진, 링크 미리보기(메신저·SNS), 모니터링, 자동화 도구, 헤드리스 브라우저를 거른다.
 * User-Agent가 없거나 너무 짧은 요청도 사람이 연 브라우저가 아니라고 본다.
 */
const BOT =
  /bot|crawl|spider|slurp|scrap|fetch|preview|monitor|uptime|lighthouse|pagespeed|headless|phantom|puppeteer|playwright|selenium|curl|wget|python|httpclient|okhttp|axios|go-http|java\/|node-fetch|undici|postman|insomnia|facebookexternalhit|embedly|kakaotalk-scrap|daumoa|yeti|whatsapp|telegram|discord|slack|skype|vkshare|pinterest|bingpreview|quora link/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.length < 20) {
    return true;
  }
  return BOT.test(userAgent);
}

/** 방문자 쿠키 값. 없거나 이상하면 새로 만들고 fresh를 true로 돌려준다. */
export function viewerOf(request: NextRequest): { id: string; fresh: boolean } {
  const value = request.cookies.get(VIEWER_COOKIE)?.value;
  if (value && COOKIE_VALUE.test(value)) {
    return { id: value, fresh: false };
  }
  return { id: randomUUID(), fresh: true };
}

/** 게이트웨이에 넘기는 방문자 키. 쿠키 값 그대로가 아니라 SHA-256 16진수(64자)만 넘긴다. */
export function viewerKey(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}

export const viewerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: VIEWER_MAX_AGE_SEC,
};
