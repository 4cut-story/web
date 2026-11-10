import { describe, expect, it, vi } from "vitest";

const loadAllRounds = vi.fn();
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/lab", () => ({ loadAllRounds: () => loadAllRounds() }));

import { labRounds } from "./lab";

describe("/lab 서버 기록", () => {
  it("모아 둔 회차를 돌려준다", async () => {
    loadAllRounds.mockResolvedValueOnce([{ id: "round29" }]);
    expect(await labRounds()).toEqual([{ id: "round29" }]);
  });

  it("GitHub에서 못 받으면 undefined를 돌려 브라우저가 직접 읽게 한다", async () => {
    loadAllRounds.mockRejectedValueOnce(new Error("403"));
    expect(await labRounds()).toBeUndefined();
  });
});
