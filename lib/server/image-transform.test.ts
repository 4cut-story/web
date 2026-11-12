// @vitest-environment node
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as image } from "@/app/api/images/[kind]/[id]/route";
import { json, mockFetch } from "@/test/fetch-mock";
import { GW, anonymous, loggedIn, params } from "@/test/server";

import {
  ImageCache,
  imageCache,
  pickFormat,
  pickWidth,
  transformable,
  transformImage,
} from "./image-transform";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ID = "V1StGXR8_Z5jdHi6B-myT";
const STORE = "http://minio:9000/4cut";
const WEBP = { accept: "image/avif,image/webp,image/png,*/*" };

/** 잡음 PNG. 단색이나 되풀이 무늬면 PNG가 WebP보다 작아질 수 있다. */
async function samplePng(width = 1024, height = 576): Promise<Uint8Array> {
  const raw = Buffer.alloc(width * height * 3);
  let seed = 1;
  for (let i = 0; i < raw.length; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    raw[i] = seed >> 23;
  }
  return new Uint8Array(
    await sharp(raw, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer(),
  );
}

function store(body: Uint8Array, etag = '"e1"') {
  return (init: RequestInit | undefined) => {
    const headers = new Headers(init?.headers);
    if (headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { etag } });
    }
    return new Response(body as BodyInit, {
      headers: { "content-type": "image/png", etag },
    });
  };
}

describe("그림 크기·형식 고르기", () => {
  it("폭은 정해 둔 값 중 그보다 크거나 같은 가장 작은 값으로 맞춘다", () => {
    expect(pickWidth("640")).toBe(640);
    expect(pickWidth("500")).toBe(512);
    expect(pickWidth("9999")).toBe(2048);
    expect(pickWidth("0")).toBeNull();
    expect(pickWidth("abc")).toBeNull();
    expect(pickWidth(null)).toBeNull();
  });

  it("Accept에 image/webp가 있을 때만 WebP로 보낸다", () => {
    expect(pickFormat(WEBP.accept)).toBe("webp");
    expect(pickFormat("image/png,*/*")).toBe("original");
    expect(pickFormat(null)).toBe("original");
  });

  it("PNG·JPEG만 바꾼다", () => {
    expect(transformable("image/png")).toBe(true);
    expect(transformable("image/jpeg; charset=binary")).toBe(true);
    expect(transformable("audio/mpeg")).toBe(false);
    expect(transformable("image/webp")).toBe(false);
  });

  it("WebP로 바꾸면 PNG보다 작고, 폭을 주면 그 폭으로 줄인다. 원본보다 늘리지 않는다", async () => {
    const png = await samplePng();
    const webp = await transformImage(png, 384, "webp");
    expect(webp?.contentType).toBe("image/webp");
    expect((await sharp(webp!.body).metadata()).width).toBe(384);
    const big = await transformImage(png, 2048, "webp");
    expect((await sharp(big!.body).metadata()).width).toBe(1024);
    const resized = await transformImage(png, 384, "original");
    expect(resized?.contentType).toBe("image/png");
    expect(await transformImage(png, null, "original")).toBeNull();
  });
});

describe("바꾼 그림 캐시", () => {
  it("한도를 넘으면 오래 안 쓴 것부터 버린다", () => {
    const cache = new ImageCache(10);
    const entry = (n: number) => ({
      etag: "e",
      body: new Uint8Array(n),
      contentType: "image/webp",
    });
    cache.set("a", entry(4));
    cache.set("b", entry(4));
    cache.get("a");
    cache.set("c", entry(4));
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
    expect(cache.size).toBe(8);
    cache.set("huge", entry(11));
    expect(cache.get("huge")).toBeUndefined();
    cache.set("a", entry(2));
    expect(cache.size).toBe(6);
  });
});

describe("이미지 중계: 그림 줄이기", () => {
  it("WebP를 받는 브라우저에는 w 폭의 WebP로 보내고, 다음에는 원본이 그대로인지만 물어 캐시로 답한다", async () => {
    const png = await samplePng();
    const calls = mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}/image`]: json({
        url: `${STORE}/panels/3.png?sig`,
      }),
      [`GET ${STORE}`]: store(png),
    });
    const first = await image(
      anonymous(`/api/images/posts/${ID}?panel=3&w=640`, { headers: WEBP }),
      params({ kind: "posts", id: ID }),
    );
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/webp");
    expect(first.headers.get("vary")).toBe("Cookie, Accept");
    const body = new Uint8Array(await first.arrayBuffer());
    expect(body.byteLength).toBeLessThan(png.byteLength);
    expect((await sharp(body).metadata()).width).toBe(640);
    // 권한 확인에는 w를 넘기지 않는다
    expect(calls[0].url).toBe(`${GW}/api/v1/posts/${ID}/image?panel=3`);

    const second = await image(
      anonymous(`/api/images/posts/${ID}?panel=3&w=640`, { headers: WEBP }),
      params({ kind: "posts", id: ID }),
    );
    expect(second.headers.get("content-type")).toBe("image/webp");
    expect(new Headers(calls[3].init?.headers).get("if-none-match")).toBe(
      '"e1"',
    );
    expect((await second.arrayBuffer()).byteLength).toBe(body.byteLength);
  });

  it("WebP를 모르는 로봇에게는 원본 PNG를 그대로 넘긴다", async () => {
    const png = await samplePng(64, 64);
    mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}/image`]: json({
        url: `${STORE}/full.png?sig`,
      }),
      [`GET ${STORE}`]: store(png),
    });
    const response = await image(
      anonymous(`/api/images/posts/${ID}`, { headers: { accept: "*/*" } }),
      params({ kind: "posts", id: ID }),
    );
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBe(png.byteLength);
  });

  it("깊이 지도와 대사 음성은 바꾸지 않는다", async () => {
    const png = await samplePng(64, 64);
    mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}/image`]: json({
        url: `${STORE}/panels/1-depth.png?sig`,
      }),
      [`GET ${STORE}`]: store(png),
    });
    const depth = await image(
      loggedIn(`/api/images/posts/${ID}?panel=1&frame=depth&w=384`, {
        headers: WEBP,
      }),
      params({ kind: "posts", id: ID }),
    );
    expect(depth.headers.get("content-type")).toBe("image/png");
    expect(depth.headers.get("vary")).toBe("Cookie");
  });

  it("바꾼 것이 원본보다 크면 원본을 보내고, 깨진 그림이면 원본을 그대로 보낸다", async () => {
    imageCache.delete(`/4cut/tiny.png|webp:`);
    const tiny = new Uint8Array(
      await sharp({
        create: { width: 2, height: 2, channels: 3, background: "#fff" },
      })
        .png()
        .toBuffer(),
    );
    mockFetch({
      [`GET ${GW}/api/v1/comics/${ID}/image`]: json({
        url: `${STORE}/tiny.png?sig`,
      }),
      [`GET ${STORE}`]: store(tiny, '"t"'),
    });
    const small = await image(
      loggedIn(`/api/images/comics/${ID}`, { headers: WEBP }),
      params({ kind: "comics", id: ID }),
    );
    expect(small.headers.get("cache-control")).toBe("private, max-age=300");
    const out = new Uint8Array(await small.arrayBuffer());
    expect(out.byteLength).toBeLessThanOrEqual(tiny.byteLength);

    const broken = new Uint8Array([137, 80, 78, 71]);
    mockFetch({
      [`GET ${GW}/api/v1/comics/${ID}/image`]: json({
        url: `${STORE}/broken.png?sig`,
      }),
      [`GET ${STORE}`]: new Response(broken as BodyInit, {
        headers: { "content-type": "image/png" },
      }),
    });
    const response = await image(
      loggedIn(`/api/images/comics/${ID}`, { headers: WEBP }),
      params({ kind: "comics", id: ID }),
    );
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(broken);
  });

  it("저장소가 실패하면 502, 오디오는 바꾸지 않고 넘긴다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}/image`]: json({ url: `${STORE}/x.png` }),
      [`GET ${STORE}`]: new Response(null, { status: 500 }),
    });
    const failed = await image(
      anonymous(`/api/images/posts/${ID}?panel=1`, { headers: WEBP }),
      params({ kind: "posts", id: ID }),
    );
    expect(failed.status).toBe(502);
    mockFetch({
      [`GET ${GW}/api/v1/sounds/${ID}/audio`]: json({ url: `${STORE}/a.mp3` }),
      [`GET ${STORE}`]: new Response(new Uint8Array([73, 68, 51]), {
        headers: { "content-type": "audio/mpeg" },
      }),
    });
    const sound = await image(
      anonymous(`/api/images/sounds/${ID}`, { headers: WEBP }),
      params({ kind: "sounds", id: ID }),
    );
    expect(sound.headers.get("content-type")).toBe("audio/mpeg");
    expect(sound.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("바꿀 수 없는 형식(WebP 원본)은 그대로 보낸다", async () => {
    const webp = new Uint8Array(
      await sharp(await samplePng(32, 32))
        .webp()
        .toBuffer(),
    );
    mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}/image`]: json({ url: `${STORE}/w.webp` }),
      [`GET ${STORE}`]: new Response(webp as BodyInit, {
        headers: { "content-type": "image/webp" },
      }),
    });
    const response = await image(
      anonymous(`/api/images/posts/${ID}?w=256`, { headers: WEBP }),
      params({ kind: "posts", id: ID }),
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(webp);
  });
});
