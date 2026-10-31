import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "./button";

describe("Button (디자인 시스템 6절)", () => {
  it("기본 버튼은 검정 바탕(primary)과 44px 높이로 그린다", () => {
    render(<Button>올리기</Button>);
    const button = screen.getByRole("button", { name: "올리기" });
    expect(button).toHaveClass("bg-primary", "text-primary-foreground", "h-11");
    expect(button).toHaveAttribute("data-slot", "button");
  });

  it("변형과 크기를 고르면 해당 토큰 클래스를 쓴다", () => {
    render(
      <Button variant="secondary" size="lg">
        저장
      </Button>,
    );
    expect(screen.getByRole("button", { name: "저장" })).toHaveClass(
      "bg-secondary",
      "h-13",
    );
  });

  it("아이콘 버튼도 누르는 영역을 44px로 둔다", () => {
    expect(buttonVariants({ size: "icon" })).toContain("size-11");
  });

  it("className으로 넘긴 클래스가 기본 클래스를 덮어쓴다", () => {
    render(<Button className="h-20">큰 버튼</Button>);
    const button = screen.getByRole("button", { name: "큰 버튼" });
    expect(button).toHaveClass("h-20");
    expect(button).not.toHaveClass("h-11");
  });

  it("누르면 onClick을 부르고, 비활성이면 부르지 않는다", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>좋아요</Button>);
    await user.click(screen.getByRole("button", { name: "좋아요" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        좋아요
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "좋아요" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("asChild면 자식 요소(링크)에 버튼 모양을 입힌다", () => {
    render(
      <Button asChild variant="outline">
        <a href="/login">GitHub로 계속하기</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "GitHub로 계속하기" });
    expect(link).toHaveClass("border-input");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
