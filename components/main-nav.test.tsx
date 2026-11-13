import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell";
import { json, mockFetch } from "@/test/fetch-mock";
import { ME } from "@/test/screen";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function labels(name: string) {
  return within(screen.getByRole("navigation", { name }))
    .getAllByRole("link")
    .map((a) => a.textContent);
}

describe("주요 메뉴", () => {
  it("로그인했으면 목소리를 캐릭터 바로 옆에 두고, 배경음은 메뉴에 없다", async () => {
    mockFetch({ "GET /api/v1/me": json(ME) });
    render(
      <AppShell title="배경음" tab="sounds">
        본문
      </AppShell>,
    );
    await waitFor(() =>
      expect(labels("주요 메뉴")).toEqual([
        "피드",
        "만들기",
        "스토리",
        "캐릭터",
        "목소리",
        "프로필",
      ]),
    );
    expect(labels("상단 메뉴")).toEqual(labels("주요 메뉴"));
    const menu = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(
      within(menu).queryByRole("link", { name: "배경음" }),
    ).not.toBeInTheDocument();
  });

  it("로그인하지 않았으면 첫 화면, 캐릭터, 목소리, 로그인만 둔다", async () => {
    mockFetch({ "GET /api/v1/me": json({}, 401) });
    render(
      <AppShell title="캐릭터" tab="characters">
        본문
      </AppShell>,
    );
    await waitFor(() =>
      expect(labels("상단 메뉴")).toEqual([
        "홈",
        "캐릭터",
        "목소리",
        "로그인",
      ]),
    );
    const top = screen.getByRole("navigation", { name: "상단 메뉴" });
    expect(within(top).getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(within(top).getByRole("link", { name: "캐릭터" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
