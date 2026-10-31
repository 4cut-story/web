// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as image } from "@/app/api/images/[kind]/[id]/route";
import { PUT as upload } from "@/app/api/uploads/[id]/[index]/route";
import { json, mockFetch } from "@/test/fetch-mock";
import { GW, anonymous, loggedIn, params } from "@/test/server";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ID = "0b7e1f0e-1111-4222-8333-444455556666";
const STORE = "http://minio:9000/4cut";

function png() {
  return new Response(new Uint8Array([137, 80, 78, 71]), {
    headers: { "content-type": "image/png" },
  });
}

describe("이미지 중계", () => {
  it("권한 확인 뒤 받은 주소에서 바이트를 받아 넘긴다", async () => {
    const calls = mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}/image`]: json({
        url: `${STORE}/full.png?sig`,
        expiresIn: 300,
      }),
      [`GET ${STORE}`]: png(),
    });
    const response = await image(
      loggedIn(`/api/images/posts/${ID}`),
      params({ kind: "posts", id: ID }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(new Uint8Array(await response.arrayBuffer())[1]).toBe(80);
    expect(calls[0].url).toBe(`${GW}/api/v1/posts/${ID}/image?size=full`);
  });

  it("썸네일을 요청하고, 토큰이 갱신되면 쿠키를 바꾼다", async () => {
    let first = true;
    const calls = mockFetch({
      [`POST ${GW}/auth/refresh`]: json({
        accessToken: "n",
        expiresIn: 1,
        refreshToken: "r2",
      }),
      [`GET ${GW}/api/v1/comics/${ID}/image`]: () => {
        const status = first ? 401 : 200;
        first = false;
        return json({ url: `${STORE}/thumb.png` }, status);
      },
      [`GET ${STORE}`]: png(),
    });
    const response = await image(
      loggedIn(`/api/images/comics/${ID}?size=thumb`),
      params({ kind: "comics", id: ID }),
    );
    expect(response.status).toBe(200);
    expect(calls[0].url).toContain("size=thumb");
    expect(response.headers.get("set-cookie")).toContain("fourcut_session=");
  });

  it("권한이 없으면 그 상태 그대로, 저장소가 실패하면 502", async () => {
    mockFetch({ [`GET ${GW}/api/v1/posts/${ID}/image`]: json({}, 403) });
    expect(
      (await image(loggedIn("/x"), params({ kind: "posts", id: ID }))).status,
    ).toBe(403);
    mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}/image`]: json({ url: `${STORE}/x` }),
      [`GET ${STORE}`]: new Response(null, { status: 500 }),
    });
    expect(
      (await image(loggedIn("/x"), params({ kind: "posts", id: ID }))).status,
    ).toBe(502);
  });

  it("모르는 종류나 ID는 404, 세션이 없으면 401", async () => {
    mockFetch({});
    expect(
      (await image(loggedIn("/x"), params({ kind: "users", id: ID }))).status,
    ).toBe(404);
    expect(
      (await image(loggedIn("/x"), params({ kind: "posts", id: "../x" })))
        .status,
    ).toBe(404);
    expect(
      (await image(anonymous("/x"), params({ kind: "posts", id: ID }))).status,
    ).toBe(401);
  });
});

describe("녹음 조각 올리기", () => {
  function chunk(body: BodyInit, session = true) {
    const init = {
      method: "PUT",
      body,
      headers: { "content-type": "audio/webm;codecs=opus" },
    };
    return session
      ? loggedIn(`/api/uploads/${ID}/0`, init)
      : anonymous(`/api/uploads/${ID}/0`, init);
  }

  it("올리기 주소를 받아 저장소에 PUT 한다", async () => {
    const calls = mockFetch({
      [`POST ${GW}/api/v1/conversations/${ID}/chunks`]: json({
        putUrl: `${STORE}/audio-raw/0`,
        expiresIn: 600,
      }),
      [`PUT ${STORE}`]: new Response(null, { status: 200 }),
    });
    const response = await upload(
      chunk(new Uint8Array([1, 2, 3])),
      params({ id: ID, index: "0" }),
    );
    expect(response.status).toBe(204);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      index: 0,
      contentType: "audio/webm;codecs=opus",
    });
    expect((calls[1].init?.body as ArrayBuffer).byteLength).toBe(3);
  });

  it("conversation-service 오류는 그대로, 저장소 실패는 502", async () => {
    mockFetch({
      [`POST ${GW}/api/v1/conversations/${ID}/chunks`]: json(
        { error: { code: "TOO_LONG" } },
        400,
      ),
    });
    const rejected = await upload(
      chunk(new Uint8Array([1])),
      params({ id: ID, index: "60" }),
    );
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toEqual({ error: { code: "TOO_LONG" } });
    mockFetch({
      [`POST ${GW}/api/v1/conversations/${ID}/chunks`]: json({
        putUrl: `${STORE}/a`,
      }),
      [`PUT ${STORE}`]: new Response(null, { status: 500 }),
    });
    expect(
      (await upload(chunk(new Uint8Array([1])), params({ id: ID, index: "1" })))
        .status,
    ).toBe(502);
  });

  it("빈 조각, 너무 큰 조각, 잘못된 경로, 세션 없음은 거절한다", async () => {
    mockFetch({});
    expect(
      (await upload(chunk(new Uint8Array(0)), params({ id: ID, index: "0" })))
        .status,
    ).toBe(400);
    expect(
      (
        await upload(
          chunk(new Uint8Array(1_000_001)),
          params({ id: ID, index: "0" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await upload(chunk(new Uint8Array(1)), params({ id: ID, index: "-1" })))
        .status,
    ).toBe(404);
    expect(
      (await upload(chunk(new Uint8Array(1)), params({ id: "x", index: "0" })))
        .status,
    ).toBe(404);
    expect(
      (
        await upload(
          chunk(new Uint8Array(1), false),
          params({ id: ID, index: "0" }),
        )
      ).status,
    ).toBe(401);
  });
});
