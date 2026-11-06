// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as image } from "@/app/api/images/[kind]/[id]/route";
import { PUT as upload } from "@/app/api/uploads/[id]/[index]/route";
import {
  DELETE as apiDelete,
  GET as apiGet,
  POST as apiPost,
} from "@/app/api/v1/[...path]/route";
import { json, mockFetch } from "@/test/fetch-mock";
import { GW, anonymous, loggedIn, params } from "@/test/server";

import { clearPatCache, patAllows } from "./pat";

const PAT = "fcp_test-token-value";
const ID = "AbCdEfGhIjKlMnOpQrStU";
const EXCHANGED = { accessToken: "pat-jwt", expiresIn: 900, scope: "publish" };

function withPat(
  url: string,
  init: { method?: string; body?: BodyInit; token?: string } = {},
) {
  return anonymous(url, {
    method: init.method,
    body: init.body,
    headers: { authorization: `Bearer ${init.token ?? PAT}` },
  });
}

function auth(call: { init?: RequestInit }): string | undefined {
  return (call.init?.headers as Record<string, string> | undefined)
    ?.Authorization;
}

beforeEach(() => {
  clearPatCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PAT: 개인 액세스 토큰으로 쿠키 없이 게시한다", () => {
  it("토큰을 Access Token으로 바꿔 게이트웨이를 부르고 쿠키는 만들지 않는다", async () => {
    const calls = mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: json(EXCHANGED),
      [`POST ${GW}/api/v1/posts`]: json({ id: ID }, 201),
    });
    const response = await apiPost(
      withPat("/api/v1/posts", { method: "POST", body: "{}" }),
      params({ path: ["posts"] }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ token: PAT });
    expect(auth(calls[1])).toBe("Bearer pat-jwt");
  });

  it("바꾼 Access Token은 다시 쓰고, 401이면 한 번 새로 바꿔 다시 부른다", async () => {
    let first = true;
    const calls = mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: () => json(EXCHANGED),
      [`GET ${GW}/api/v1/conversations`]: () => {
        if (first) {
          first = false;
          return json({}, 200);
        }
        return new Response(null, { status: 401 });
      },
    });
    await apiGet(
      withPat("/api/v1/conversations"),
      params({ path: ["conversations"] }),
    );
    const second = await apiGet(
      withPat("/api/v1/conversations"),
      params({ path: ["conversations"] }),
    );
    const exchanges = calls.filter((c) => c.url.endsWith("/auth/pat/exchange"));
    expect(exchanges).toHaveLength(2);
    expect(second.status).toBe(401);
  });

  it("없거나 폐기된 토큰은 401", async () => {
    mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: json({ error: {} }, 401),
    });
    const response = await apiPost(
      withPat("/api/v1/posts", { method: "POST", body: "{}" }),
      params({ path: ["posts"] }),
    );
    expect(response.status).toBe(401);
  });

  it("토큰 관리·탈퇴·댓글은 토큰으로 열리지 않는다 (403, 게이트웨이를 부르지 않음)", async () => {
    const calls = mockFetch({});
    const tokens = await apiPost(
      withPat("/api/v1/me/tokens", { method: "POST", body: "{}" }),
      params({ path: ["me", "tokens"] }),
    );
    const remove = await apiDelete(
      withPat("/api/v1/me", { method: "DELETE" }),
      params({ path: ["me"] }),
    );
    const comment = await apiPost(
      withPat("/api/v1/comments", { method: "POST", body: "{}" }),
      params({ path: ["comments"] }),
    );
    expect([tokens.status, remove.status, comment.status]).toEqual([
      403, 403, 403,
    ]);
    expect(calls).toHaveLength(0);
  });

  it("허용 경로 표", () => {
    expect(patAllows("POST", ["conversations"])).toBe(true);
    expect(patAllows("PUT", ["comics", ID, "publish"])).toBe(true);
    expect(patAllows("GET", ["me"])).toBe(true);
    expect(patAllows("GET", ["me", "tokens"])).toBe(false);
    expect(patAllows("DELETE", ["me"])).toBe(false);
    expect(patAllows("POST", ["characters"])).toBe(false);
    expect(patAllows("POST", ["follows", ID])).toBe(false);
    expect(patAllows("GET", [])).toBe(false);
    expect(patAllows("DELETE", ["posts", ID])).toBe(true);
    expect(patAllows("DELETE", ["posts", ID, "comments"])).toBe(false);
    expect(patAllows("DELETE", ["conversations", ID])).toBe(false);
    expect(patAllows("POST", ["posts"])).toBe(true);
  });

  it("쿠키 세션이 있으면 토큰보다 세션을 쓴다", async () => {
    const calls = mockFetch({
      [`GET ${GW}/api/v1/me`]: json({ id: ID }),
    });
    await apiGet(
      loggedIn("/api/v1/me", { headers: { authorization: `Bearer ${PAT}` } }),
      params({ path: ["me"] }),
    );
    expect(calls).toHaveLength(1);
    expect(auth(calls[0])).toBe("Bearer old");
  });

  it("fcp_로 시작하지 않는 Bearer 값은 무시한다 (로그인 필요)", async () => {
    const calls = mockFetch({});
    const response = await apiPost(
      withPat("/api/v1/posts", { method: "POST", body: "{}", token: "jwt" }),
      params({ path: ["posts"] }),
    );
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("녹음 조각 올리기와 이미지 받기도 토큰으로 된다", async () => {
    const calls = mockFetch({
      [`POST ${GW}/auth/pat/exchange`]: json(EXCHANGED),
      [`POST ${GW}/api/v1/conversations/${ID}/chunks`]: json({
        putUrl: "http://storage/put",
      }),
      ["PUT http://storage/put"]: new Response(null, { status: 200 }),
      [`GET ${GW}/api/v1/comics/${ID}/image`]: json({
        url: "http://storage/img",
      }),
      ["GET http://storage/img"]: new Response("png", {
        headers: { "content-type": "image/png" },
      }),
    });
    const put = await upload(
      withPat(`/api/uploads/${ID}/0`, { method: "PUT", body: "abc" }),
      params({ id: ID, index: "0" }),
    );
    expect(put.status).toBe(204);
    const img = await image(
      withPat(`/api/images/comics/${ID}`),
      params({ kind: "comics", id: ID }),
    );
    expect(img.status).toBe(200);
    expect(
      calls.filter((c) => c.url.endsWith("/auth/pat/exchange")),
    ).toHaveLength(1);
  });
});
