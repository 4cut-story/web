import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";

describe("GitHub 링크와 바닥글", () => {
  it("상단 메뉴와 바닥글에 GitHub 링크가 새 탭으로 열린다", () => {
    render(
      <AppShell title="피드" tab="feed">
        본문
      </AppShell>,
    );
    const icon = screen.getByRole("link", {
      name: "GitHub에서 소스 코드 보기",
    });
    expect(icon).toHaveAttribute("href", "https://github.com/4cut-story");
    expect(icon).toHaveAttribute("target", "_blank");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(
      `© ${new Date().getFullYear()} 4cut story`,
    );
    expect(
      screen.getByRole("link", { name: "GitHub에서 소스 보기" }),
    ).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("하단 탭이 없는 화면에도 바닥글이 있다", () => {
    render(<AppShell title="로그인">본문</AppShell>);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "GitHub에서 소스 코드 보기" }),
    ).not.toBeInTheDocument();
  });
});
