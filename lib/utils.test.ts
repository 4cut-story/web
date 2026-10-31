import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("조건부 클래스를 합치고 거짓 값은 뺀다", () => {
    expect(cn("px-4", false && "hidden", undefined, "text-sm")).toBe(
      "px-4 text-sm",
    );
  });

  it("겹치는 Tailwind 클래스는 뒤의 것만 남긴다", () => {
    expect(cn("px-4 h-11", "px-6")).toBe("h-11 px-6");
  });
});
