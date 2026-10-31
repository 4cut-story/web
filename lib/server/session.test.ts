// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { gatewayUrl, publicUrl, sessionSecret } from "./config";
import { openSession, sealSession, writeSession } from "./session";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("세션 쿠키", () => {
  it("암호화한 세션을 다시 풀 수 있다", () => {
    const sealed = sealSession({ accessToken: "a.b.c", refreshToken: "r1" });
    expect(sealed).not.toContain("a.b.c");
    expect(openSession(sealed)).toEqual({
      accessToken: "a.b.c",
      refreshToken: "r1",
    });
  });

  it("위조되거나 비어 있으면 null", () => {
    const sealed = sealSession({ accessToken: "a", refreshToken: "r" });
    expect(openSession(sealed.slice(0, -2) + "xx")).toBeNull();
    expect(openSession(undefined)).toBeNull();
    expect(openSession("")).toBeNull();
  });

  it("다른 비밀 값으로는 풀 수 없다", () => {
    vi.stubEnv("SESSION_SECRET", "first-secret-value-123");
    const sealed = sealSession({ accessToken: "a", refreshToken: "r" });
    vi.stubEnv("SESSION_SECRET", "second-secret-value-456");
    expect(openSession(sealed)).toBeNull();
  });

  it("쿠키는 HttpOnly, SameSite=Lax로 쓰고 null이면 지운다", () => {
    const set = vi.fn();
    writeSession({ set }, { accessToken: "a", refreshToken: "r" });
    expect(set.mock.calls[0][2]).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    writeSession({ set }, null);
    expect(set.mock.calls[1][1]).toBe("");
    expect(set.mock.calls[1][2].maxAge).toBe(0);
  });
});

describe("서버 설정", () => {
  it("운영에서 SESSION_SECRET이 없으면 실패한다", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => sessionSecret()).toThrow();
  });

  it("주소 끝의 /를 떼고 붙인다", () => {
    vi.stubEnv("SERVICES_GATEWAY_URL", "http://gw:8080/");
    vi.stubEnv("PUBLIC_BASE_URL", "https://4cut.example/");
    expect(gatewayUrl()).toBe("http://gw:8080");
    expect(publicUrl("/login")).toBe("https://4cut.example/login");
  });
});
