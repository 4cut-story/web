// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as list } from "@/app/api/open/v1/sounds/route";
import { GET as one } from "@/app/api/open/v1/sounds/[...path]/route";
import { GET as apiGet } from "@/app/api/v1/[...path]/route";
import { json, mockFetch } from "@/test/fetch-mock";
import { GW, anonymous, loggedIn, params } from "@/test/server";

import { clearRateLimit, RATE_LIMIT } from "./open-api";
import { clearPatCache } from "./pat";

const PAT = "fcp_sound-token";
const ID = "AbCdEfGhIjKlMnOpQrStU";
const SOUNDS = { accessToken: "sound-jwt", expiresIn: 900, scope: "sounds" };
const PUBLISH = { ...SOUNDS, scope: "publish" };
const SOUND = { id: ID, kind: "EFFECT", title: "문 두드리는 소리" };

function withPat(url: string, token = PAT) {
  return anonymous(url, { headers: { authorization: `Bearer ${token}` } });
}

beforeEach(() => {
  clearPatCache();
  clearRateLimit();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("소리 검색 API: 소리 검색 개인 토큰으로만 부른다", () => {
  it("검색 조건만 넘기고, 소리마다 미리 듣기·상세 주소를 붙인다", async () => {
    const calls = mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: json(SOUNDS),
      [`GET ${GW}/api/v1/sounds?q=%EB%B9%84&kind=AMBIENCE&size=5`]: json({
        items: [SOUND],
        nextCursor: null,
      }),
    });
    const response = await list(
      withPat("/api/open/v1/sounds?q=비&kind=AMBIENCE&size=5&evil=1&mood="),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items[0].audioUrl).toBe(
      `http://localhost:3000/api/images/sounds/${ID}`,
    );
    expect(body.items[0].pageUrl).toBe(`http://localhost:3000/sounds/${ID}`);
    expect(
      (calls[1].init?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer sound-jwt");
  });

  it("상세는 소리와 비슷한 소리 모두에 주소를 붙이고, facets는 그대로 준다", async () => {
    mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: json(SOUNDS),
      [`GET ${GW}/api/v1/sounds/${ID}`]: json({
        sound: SOUND,
        similar: [SOUND],
      }),
      [`GET ${GW}/api/v1/sounds/facets`]: json({ categories: [], moods: [] }),
    });
    const detail = await (
      await one(withPat(`/api/open/v1/sounds/${ID}`), params({ path: [ID] }))
    ).json();
    expect(detail.sound.audioUrl).toContain(ID);
    expect(detail.similar[0].pageUrl).toContain(`/sounds/${ID}`);
    const facets = await one(
      withPat("/api/open/v1/sounds/facets"),
      params({ path: ["facets"] }),
    );
    expect(await facets.json()).toEqual({ categories: [], moods: [] });
  });

  it("토큰이 없으면 로그인 쿠키가 있어도 401, 모르는 경로는 404", async () => {
    const calls = mockFetch({});
    const cookie = await list(loggedIn("/api/open/v1/sounds"));
    const none = await list(anonymous("/api/open/v1/sounds"));
    const bad = await one(
      withPat(`/api/open/v1/sounds/${ID}/audio`),
      params({ path: [ID, "audio"] }),
    );
    const badId = await one(
      withPat("/api/open/v1/sounds/x!"),
      params({ path: ["x!"] }),
    );
    expect([cookie.status, none.status, bad.status, badId.status]).toEqual([
      401, 401, 404, 404,
    ]);
    expect(calls).toHaveLength(0);
  });

  it("게시 토큰은 403, 폐기된 토큰은 401, 게이트웨이 오류는 그대로 준다", async () => {
    mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: (init?: RequestInit) =>
        String(init?.body).includes("fcp_publish")
          ? json(PUBLISH)
          : String(init?.body).includes("fcp_gone")
            ? json({ error: {} }, 401)
            : json(SOUNDS),
      [`GET ${GW}/api/v1/sounds/${ID}`]: json(
        { error: { code: "NOT_FOUND", message: "없어요" } },
        404,
      ),
    });
    const publish = await list(withPat("/api/open/v1/sounds", "fcp_publish"));
    expect(publish.status).toBe(403);
    expect((await publish.json()).error.code).toBe("FORBIDDEN");
    const gone = await list(withPat("/api/open/v1/sounds", "fcp_gone"));
    expect(gone.status).toBe(401);
    const missing = await one(
      withPat(`/api/open/v1/sounds/${ID}`),
      params({ path: [ID] }),
    );
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("NOT_FOUND");
  });

  it("소리 검색 토큰으로는 게시 경로(/api/v1)를 부를 수 없다 (403)", async () => {
    mockFetch({ [`POST ${GW}/auth/pat/exchange`]: json(SOUNDS) });
    const response = await apiGet(
      withPat("/api/v1/conversations"),
      params({ path: ["conversations"] }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toContain("소리 검색");
  });

  it(`토큰 하나로 1분에 ${RATE_LIMIT}번이 넘으면 429`, async () => {
    mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: json(SOUNDS),
      [`GET ${GW}/api/v1/sounds`]: () => json({ items: [], nextCursor: null }),
    });
    for (let i = 0; i < RATE_LIMIT; i++) {
      expect((await list(withPat("/api/open/v1/sounds"))).status).toBe(200);
    }
    const over = await list(withPat("/api/open/v1/sounds"));
    expect(over.status).toBe(429);
    expect(over.headers.get("retry-after")).toBe("60");
  });
});
