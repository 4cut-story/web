// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxyApi } from "./api-proxy";
import { GW, anonymous, loggedIn } from "@/test/server";
import { json, mockFetch } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BFF API 중계", () => {
  it("토큰을 붙여 게이트웨이 같은 경로로 넘긴다", async () => {
    const calls = mockFetch({
      [`GET ${GW}/api/v1/feed`]: json({ items: [], nextCursor: null }),
    });
    const response = await proxyApi(loggedIn("/api/v1/feed?size=5"), ["feed"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], nextCursor: null });
    expect(calls[0].url).toBe(`${GW}/api/v1/feed?size=5`);
    expect(
      (calls[0].init?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer old");
  });

  it("401이면 토큰을 갱신해 다시 부르고 쿠키를 바꾼다", async () => {
    let first = true;
    const calls = mockFetch({
      [`POST ${GW}/auth/refresh`]: json({
        accessToken: "new",
        expiresIn: 600,
        refreshToken: "r2",
      }),
      [`POST ${GW}/api/v1/conversations`]: () => {
        const status = first ? 401 : 201;
        first = false;
        return json({ id: "c1" }, status);
      },
    });
    const response = await proxyApi(
      loggedIn("/api/v1/conversations", {
        method: "POST",
        body: '{"source":"UPLOAD"}',
      }),
      ["conversations"],
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("fourcut_session=");
    expect(
      (calls[2].init?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer new");
    expect(calls[2].init?.body).toBe('{"source":"UPLOAD"}');
  });

  it("만료된 토큰으로 여러 요청이 한꺼번에 와도 갱신은 한 번만 보내고 모두 새 토큰으로 부른다", async () => {
    let refreshes = 0;
    const calls = mockFetch({
      [`POST ${GW}/auth/refresh`]: () => {
        refreshes++;
        return json({ accessToken: "new", expiresIn: 600, refreshToken: "r2" });
      },
      [`GET ${GW}/api/v1/feed`]: (init?: RequestInit) =>
        json(
          {},
          (init?.headers as Record<string, string>).Authorization ===
            "Bearer new"
            ? 200
            : 401,
        ),
    });
    const responses = await Promise.all(
      [1, 2, 3].map(() => proxyApi(loggedIn("/api/v1/feed"), ["feed"])),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    for (const r of responses) {
      expect(r.headers.get("set-cookie")).toContain("fourcut_session=");
    }
    expect(refreshes).toBe(1);
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(
      1,
    );

    // 조금 뒤 옛 쿠키로 온 요청도 같은 결과를 쓴다
    const late = await proxyApi(loggedIn("/api/v1/feed"), ["feed"]);
    expect(late.status).toBe(200);
    expect(refreshes).toBe(1);
  });

  it("갱신에 실패한 결과는 나눠 쓰지 않는다", async () => {
    let refreshes = 0;
    mockFetch({
      [`POST ${GW}/auth/refresh`]: () => {
        refreshes++;
        return json({}, 503);
      },
      [`GET ${GW}/api/v1/feed`]: json({}, 401),
    });
    await proxyApi(loggedIn("/api/v1/feed"), ["feed"]);
    await proxyApi(loggedIn("/api/v1/feed"), ["feed"]);
    expect(refreshes).toBe(2);
  });

  it("갱신도 실패하면 401을 돌려주고 쿠키를 지운다", async () => {
    mockFetch({
      [`POST ${GW}/auth/refresh`]: json({}, 401),
      [`DELETE ${GW}/api/v1/me`]: json(
        { error: { code: "UNAUTHORIZED" } },
        401,
      ),
    });
    const response = await proxyApi(
      loggedIn("/api/v1/me", { method: "DELETE" }),
      ["me"],
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toMatch(/fourcut_session=;/);
  });

  it("204는 본문 없이 돌려준다", async () => {
    mockFetch({
      [`PUT ${GW}/api/v1/follows/u1`]: new Response(null, { status: 204 }),
    });
    const response = await proxyApi(
      loggedIn("/api/v1/follows/u1", { method: "PUT" }),
      ["follows", "u1"],
    );
    expect(response.status).toBe(204);
  });

  it("004 FR-050: RSS 구독 API(/api/v1/rss-feeds)를 게이트웨이로 넘긴다", async () => {
    const calls = mockFetch({
      [`POST ${GW}/api/v1/rss-feeds`]: json({ id: "f1" }, 201),
    });
    const created = await proxyApi(
      loggedIn("/api/v1/rss-feeds", {
        method: "POST",
        body: JSON.stringify({ url: "https://news.example.com/rss" }),
      }),
      ["rss-feeds"],
    );
    expect(created.status).toBe(201);
    expect(calls[0].url).toBe(`${GW}/api/v1/rss-feeds`);
  });

  it("허용하지 않은 경로와 이상한 경로 조각은 404", async () => {
    mockFetch({});
    expect(
      (await proxyApi(loggedIn("/api/v1/internal"), ["internal"])).status,
    ).toBe(404);
    expect(
      (await proxyApi(loggedIn("/api/v1/feed/.."), ["feed", ".."])).status,
    ).toBe(404);
  });

  it("세션이 없으면 읽기만 토큰 없이 넘기고, 쓰기는 401", async () => {
    const calls = mockFetch({
      [`GET ${GW}/api/v1/feed`]: json({ items: [], nextCursor: null }),
    });
    expect((await proxyApi(anonymous("/api/v1/feed"), ["feed"])).status).toBe(
      200,
    );
    expect(
      (calls[0].init?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
    expect(
      (
        await proxyApi(anonymous("/api/v1/posts/p1/like", { method: "PUT" }), [
          "posts",
          "p1",
          "like",
        ])
      ).status,
    ).toBe(401);
    expect(calls).toHaveLength(1);
  });
});
