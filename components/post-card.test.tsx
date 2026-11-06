import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PostCard } from "./post-card";
import type { Post } from "@/lib/types";
import { OTHER, post as fixture } from "@/test/screen";

const post = (o: Record<string, unknown> = {}) => fixture(o) as Post;
import { json, mockFetch, noContent } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("게시물 카드 (FR-021)", () => {
  it("좋아요를 누르고, 실패하면 되돌린다", async () => {
    mockFetch({
      "PUT /api/v1/posts/p1/like": noContent(),
      "DELETE /api/v1/posts/p1/like": json({}, 500),
    });
    render(<PostCard post={post()} author={OTHER} />);
    const like = screen.getByRole("button", { name: "좋아요" });
    await userEvent.click(like);
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(like).toHaveTextContent("3");
    await userEvent.click(like);
    await waitFor(() => expect(like).toHaveAttribute("aria-pressed", "true"));
  });

  it("캡션이 제목과 같으면 다시 쓰지 않고, 4컷 자리를 미리 잡는다", () => {
    render(
      <PostCard
        post={post({ caption: "편의점 대소동", visibility: "FOLLOWERS" })}
      />,
    );
    const image = screen.getByAltText("편의점 대소동");
    expect(image).toHaveAttribute("width", "800");
    expect(image).toHaveAttribute("height", "3206");
    expect(screen.queryByText("편의점 대소동")).not.toBeInTheDocument();
    expect(screen.getByLabelText("팔로워만")).toBeInTheDocument();
    expect(screen.getByText("알 수 없음")).toBeInTheDocument();
  });

  it("캡션이 제목과 다르면 보여 준다", () => {
    render(<PostCard post={post()} author={OTHER} />);
    expect(screen.getByText("오늘 있었던 일")).toBeInTheDocument();
  });

  it("공유: 공유 시트가 있으면 쓰고, 없으면 주소를 복사한다", async () => {
    mockFetch({});
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareFn,
      configurable: true,
    });
    const { unmount } = render(<PostCard post={post()} author={OTHER} />);
    await userEvent.click(screen.getByRole("button", { name: "공유" }));
    expect(shareFn).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining("/posts/p1") }),
    );
    unmount();

    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<PostCard post={post()} author={OTHER} />);
    await userEvent.click(screen.getByRole("button", { name: "공유" }));
    expect(writeText).toHaveBeenCalled();
    expect(
      await screen.findByRole("button", { name: "주소를 복사했어요" }),
    ).toBeInTheDocument();
  });

  it("공유를 닫으면 조용히 넘어간다", async () => {
    mockFetch({});
    Object.defineProperty(navigator, "share", {
      value: vi.fn().mockRejectedValue(new Error("AbortError")),
      configurable: true,
    });
    render(<PostCard post={post()} author={OTHER} />);
    await userEvent.click(screen.getByRole("button", { name: "공유" }));
    expect(screen.getByRole("button", { name: "공유" })).toBeInTheDocument();
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
  });
});
