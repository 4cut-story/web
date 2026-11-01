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
