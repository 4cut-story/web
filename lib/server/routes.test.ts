// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as callback } from "@/app/auth/callback/[provider]/route";
import { GET as complete } from "@/app/auth/complete/route";
import { POST as devLogin } from "@/app/auth/dev-login/route";
import { GET as login } from "@/app/auth/login/[provider]/route";
import { POST as logout } from "@/app/auth/logout/route";
import { GET as health } from "@/app/api/health/route";
import { GET as providers } from "@/app/api/providers/route";
import { GET as apiGet } from "@/app/api/v1/[...path]/route";
import { json, mockFetch } from "@/test/fetch-mock";
import { GW, anonymous, loggedIn, params } from "@/test/server";

afterEach(() => {
  vi.unstubAllGlobals();
});

const TOKENS = { accessToken: "a", expiresIn: 600, refreshToken: "r" };

describe("공급자 로그인 중계", () => {
  it("로그인 시작은 auth-service의 302와 로그인 과정 쿠키를 그대로 돌려준다", async () => {
    const calls = mockFetch({
      [`GET ${GW}/auth/login/github`]: new Response(null, {
        status: 302,
        headers: {
          location: "https://github.com/login/oauth/authorize?state=s",
          "set-cookie": "AUTH_LOGIN_SESSION=abc; Path=/; HttpOnly",
        },
      }),
    });
    const response = await login(
      anonymous("/auth/login/github"),
      params({ provider: "github" }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("github.com");
    expect(response.headers.get("set-cookie")).toContain(
      "AUTH_LOGIN_SESSION=abc",
    );
    expect(calls[0].init?.redirect).toBe("manual");
  });

  it("돌아오기는 쿼리와 쿠키를 넘기고 /auth/complete로 보낸다", async () => {
    const calls = mockFetch({
      [`GET ${GW}/auth/callback/google`]: new Response(null, {
        status: 302,
        headers: { location: "http://localhost:3000/auth/complete?code=one" },
      }),
    });
    const response = await callback(
      anonymous("/auth/callback/google?code=x&state=s", {
        headers: { cookie: "AUTH_LOGIN_SESSION=abc" },
      }),
      params({ provider: "google" }),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/complete?code=one",
    );
    expect(calls[0].url).toBe(`${GW}/auth/callback/google?code=x&state=s`);
    expect((calls[0].init?.headers as Record<string, string>).cookie).toBe(
      "AUTH_LOGIN_SESSION=abc",
    );
  });

  it("설정되지 않은 공급자, 모르는 공급자, 서버 오류는 로그인 화면으로", async () => {
    mockFetch({ [`GET ${GW}/auth/login/google`]: json({}, 404) });
    const notConfigured = await login(
      anonymous("/auth/login/google"),
      params({ provider: "google" }),
    );
    expect(notConfigured.headers.get("location")).toContain(
      "/login?error=PROVIDER_NOT_CONFIGURED",
    );
    const unknown = await login(
      anonymous("/auth/login/kakao"),
      params({ provider: "kakao" }),
    );
    expect(unknown.headers.get("location")).toContain("error=UNKNOWN_PROVIDER");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const down = await login(
      anonymous("/auth/login/github"),
      params({ provider: "github" }),
    );
    expect(down.headers.get("location")).toContain("error=LOGIN_UNAVAILABLE");
  });
});

describe("로그인 마무리", () => {
  it("코드를 토큰으로 바꿔 쿠키에 담고 내 페이지(/me)로 보낸다", async () => {
    mockFetch({ [`POST ${GW}/auth/token`]: json(TOKENS) });
    const response = await complete(anonymous("/auth/complete?code=one"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/me");
    expect(response.headers.get("set-cookie")).toContain("fourcut_session=");
  });

  it("코드가 없거나 틀리거나 서버가 안 되면 로그인 화면으로", async () => {
    mockFetch({ [`POST ${GW}/auth/token`]: json({}, 400) });
    expect(
      (await complete(anonymous("/auth/complete"))).headers.get("location"),
    ).toContain("LOGIN_FAILED");
    expect(
      (await complete(anonymous("/auth/complete?code=bad"))).headers.get(
        "location",
      ),
    ).toContain("LOGIN_FAILED");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(
      (await complete(anonymous("/auth/complete?code=x"))).headers.get(
        "location",
      ),
    ).toContain("LOGIN_UNAVAILABLE");
  });

  it("개발용 로그인은 코드를 받아 바로 세션을 만든다", async () => {
    mockFetch({
      [`POST ${GW}/auth/dev-login`]: json({ code: "dev" }),
      [`POST ${GW}/auth/token`]: json(TOKENS),
    });
    const response = await devLogin(
      anonymous("/auth/dev-login", {
        method: "POST",
        body: '{"nickname":"marco"}',
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("fourcut_session=");
  });

  it("개발용 로그인이 꺼져 있으면 그 오류를 그대로, 토큰 교환이 실패하면 502", async () => {
    mockFetch({
      [`POST ${GW}/auth/dev-login`]: json(
        { error: { code: "NOT_FOUND" } },
        404,
      ),
    });
    expect(
      (
        await devLogin(
          anonymous("/auth/dev-login", { method: "POST", body: "x" }),
        )
      ).status,
    ).toBe(404);
    mockFetch({
      [`POST ${GW}/auth/dev-login`]: json({ code: "dev" }),
      [`POST ${GW}/auth/token`]: json({}, 400),
    });
    expect(
      (
        await devLogin(
          anonymous("/auth/dev-login", {
            method: "POST",
            body: '{"nickname":"a"}',
          }),
        )
      ).status,
    ).toBe(502);
  });

  it("로그아웃은 refresh token을 끊고 쿠키를 지운다 (auth-service가 안 돼도)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const response = await logout(loggedIn("/auth/logout", { method: "POST" }));
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toMatch(/fourcut_session=;/);
    expect(fetch).toHaveBeenCalledOnce();
    expect(
      (await logout(anonymous("/auth/logout", { method: "POST" }))).status,
    ).toBe(204);
  });
});

describe("그 밖의 경로", () => {
  it("health는 UP", async () => {
    expect(await health().json()).toEqual({ status: "UP" });
  });

  it("로그인 공급자 목록, 실패하면 빈 목록", async () => {
    mockFetch({
      [`GET ${GW}/auth/providers`]: json({
        items: ["github"],
        devLogin: false,
      }),
    });
    expect(await (await providers()).json()).toEqual({
      items: ["github"],
      devLogin: false,
    });
    mockFetch({});
    expect(await (await providers()).json()).toEqual({
      items: [],
      devLogin: false,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await (await providers()).json()).toEqual({
      items: [],
      devLogin: false,
    });
  });

  it("/api/v1/** 경로 처리기는 경로 조각을 넘긴다", async () => {
    mockFetch({ [`GET ${GW}/api/v1/comics/1`]: json({ id: "1" }) });
    const response = await apiGet(
      loggedIn("/api/v1/comics/1"),
      params({ path: ["comics", "1"] }),
    );
    expect(await response.json()).toEqual({ id: "1" });
  });
});
