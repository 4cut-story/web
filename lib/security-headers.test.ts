import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

import { SECURITY_HEADERS } from "./security-headers";

describe("보안 헤더", () => {
  it("모든 경로에 보안 헤더를 붙이고 x-powered-by를 끈다", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    expect(rules).toEqual([{ source: "/:path*", headers: SECURITY_HEADERS }]);
  });

  it("녹음에 쓰는 마이크는 열고, 다른 사이트가 화면을 iframe에 넣지 못하게 한다", () => {
    const value = (key: string) =>
      SECURITY_HEADERS.find((h) => h.key === key)?.value;
    expect(value("Permissions-Policy")).toContain("microphone=(self)");
    expect(value("X-Frame-Options")).toBe("DENY");
    expect(value("Strict-Transport-Security")).toMatch(/max-age=\d+/);
  });
});
