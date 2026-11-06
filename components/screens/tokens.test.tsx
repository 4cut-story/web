import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TokensScreen, type AccessToken } from "./tokens-screen";
import { router } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/me/tokens",
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const TOKEN: AccessToken = {
  id: "t1",
  name: "스토리 자동화",
  hint: "fcp_abcd",
  scope: "publish",
  createdAt: "2026-11-06T00:00:00Z",
  expiresAt: "2099-01-01T00:00:00Z",
  lastUsedAt: null,
  revokedAt: null,
};

describe("PAT: 개인 토큰 화면", () => {
  it("토큰을 발급하면 원문을 한 번 보여 주고, 목록에서 폐기한다", async () => {
    const calls = mockFetch({
      "POST /api/v1/me/tokens": json(
        { token: "fcp_secret-once", info: TOKEN },
        201,
      ),
      "GET /api/v1/me/tokens": json({ items: [TOKEN] }),
      "DELETE /api/v1/me/tokens/t1": noContent(),
    });
    render(<TokensScreen />);
    expect(await screen.findByText("스토리 자동화")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("이름"), "새 자동화");
    await userEvent.selectOptions(screen.getByLabelText("유효 기간"), "90");
    await userEvent.click(screen.getByRole("button", { name: "토큰 발급" }));
    expect(await screen.findByTestId("issued-token")).toHaveTextContent(
      "fcp_secret-once",
    );
    const issue = calls.find((c) => c.method === "POST");
    expect(JSON.parse(issue?.init?.body as string)).toEqual({
      name: "새 자동화",
      expiresInDays: 90,
    });
    await userEvent.click(screen.getByRole("button", { name: "폐기" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(true);
  });

  it("폐기·만료된 토큰은 상태만 보여 주고 폐기 버튼이 없다", async () => {
    mockFetch({
      "GET /api/v1/me/tokens": json({
        items: [
          { ...TOKEN, id: "a", revokedAt: "2026-11-06T01:00:00Z" },
          {
            ...TOKEN,
            id: "b",
            name: "옛 토큰",
            expiresAt: "2020-01-01T00:00:00Z",
            lastUsedAt: "2019-12-01T00:00:00Z",
          },
        ],
      }),
    });
    render(<TokensScreen />);
    expect(await screen.findByText(/폐기됨/)).toBeInTheDocument();
    expect(screen.getByText(/만료됨/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "폐기" })).toBeNull();
  });

  it("발급에 실패하면 오류를 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/me/tokens": json({ items: [] }),
      "POST /api/v1/me/tokens": json(
        {
          error: { code: "CONFLICT", message: "토큰은 5개까지 쓸 수 있어요." },
        },
        409,
      ),
    });
    render(<TokensScreen />);
    await userEvent.type(screen.getByLabelText("이름"), "x");
    await userEvent.click(screen.getByRole("button", { name: "토큰 발급" }));
    expect(
      await screen.findByText("토큰은 5개까지 쓸 수 있어요."),
    ).toBeInTheDocument();
  });
});
