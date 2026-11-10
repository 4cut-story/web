// @vitest-environment node
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as view } from "@/app/api/v1/posts/[id]/views/route";
import { isBot } from "@/lib/server/views";
import { json, mockFetch } from "@/test/fetch-mock";
import { GW, anonymous, loggedIn, params } from "@/test/server";

afterEach(() => {
  vi.unstubAllGlobals();
});

const BROWSER =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const VID = "0b6f2c1e-6a63-4f3a-9a77-3f3d8b0c1a2b";

function headersOf(init: RequestInit | undefined): Record<string, string> {
  return init?.headers as Record<string, string>;
}

describe("만화별 조회수 중계", () => {
  it("방문자 쿠키가 없으면 만들어 주고, 게이트웨이에는 쿠키의 SHA-256만 넘긴다", async () => {
    const calls = mockFetch({
      [`POST ${GW}/api/v1/posts/p1/views`]: json({
        viewCount: 5,
        counted: true,
      }),
    });
    const response = await view(
      anonymous("/api/v1/posts/p1/views", {
        method: "POST",
        headers: { "user-agent": BROWSER },
      }),
      params({ id: "p1" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ viewCount: 5, counted: true });
    const cookie = response.cookies.get("fourcut_vid");
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(cookie?.httpOnly).toBe(true);
    const key = headersOf(calls[0].init)["X-Viewer-Key"];
    expect(key).toBe(createHash("sha256").update(cookie!.value).digest("hex"));
    expect(headersOf(calls[0].init).Authorization).toBeUndefined();
  });

  it("있는 방문자 쿠키는 그대로 쓰고, 로그인했으면 토큰도 붙인다", async () => {
    const calls = mockFetch({
      [`POST ${GW}/api/v1/posts/p1/views`]: json({
        viewCount: 5,
        counted: false,
      }),
    });
    const request = loggedIn("/api/v1/posts/p1/views", {
      method: "POST",
      headers: { "user-agent": BROWSER },
    });
    request.cookies.set("fourcut_vid", VID);
    const response = await view(request, params({ id: "p1" }));
    expect(response.status).toBe(200);
    expect(response.cookies.get("fourcut_vid")).toBeUndefined();
    expect(headersOf(calls[0].init)["X-Viewer-Key"]).toBe(
      createHash("sha256").update(VID).digest("hex"),
    );
    expect(headersOf(calls[0].init).Authorization).toBe("Bearer old");
  });

  it("봇·크롤러는 세지 않고 204, 이상한 ID는 404", async () => {
    const calls = mockFetch({});
    for (const ua of [
      "Googlebot/2.1 (+http://www.google.com/bot.html)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0 Safari/537.36",
      "curl/8.5.0",
    ]) {
      const response = await view(
        anonymous("/api/v1/posts/p1/views", {
          method: "POST",
          headers: { "user-agent": ua },
        }),
        params({ id: "p1" }),
      );
      expect(response.status).toBe(204);
    }
    const bad = await view(
      anonymous("/api/v1/posts/x/views", {
        method: "POST",
        headers: { "user-agent": BROWSER },
      }),
      params({ id: "../me" }),
    );
    expect(bad.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("User-Agent가 없거나 짧으면 봇으로 본다", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot("x")).toBe(true);
    expect(isBot(BROWSER)).toBe(false);
  });
});
