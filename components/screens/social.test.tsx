import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MeScreen } from "./me-screen";
import { PostScreen } from "./post-screen";
import { ProfileScreen } from "./profile-screen";
import { navigation } from "@/lib/api";
import { ME, OTHER, post, router } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  router.push.mockReset();
});

const COMMENT = {
  id: "m1",
  postId: "p1",
  authorId: "me",
  text: "재밌다",
  createdAt: "2026-10-31T00:00:00Z",
};

describe("게시물 상세와 댓글 (FR-021, FR-022)", () => {
  it("댓글을 달고 내 댓글을 지운다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({
        items: [COMMENT],
        nextCursor: null,
      }),
      "GET /api/v1/posts/p1": json(post()),
      "GET /api/v1/me": json(ME),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
      "POST /api/v1/posts/p1/comments": json(
        { ...COMMENT, id: "m2", text: "나도" },
        201,
      ),
      "DELETE /api/v1/comments/m1": noContent(),
    });
    render(<PostScreen id="p1" />);
    const comments = await screen.findByRole("region", { name: "댓글" });
    expect(await within(comments).findByText("재밌다")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "내리기" }),
    ).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("댓글 입력"), "나도");
    await userEvent.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("나도")).toBeInTheDocument();
    await userEvent.click(
      within(comments).getAllByRole("button", { name: "삭제" })[0],
    );
    expect(screen.queryByText("재밌다")).not.toBeInTheDocument();
  });

  it("댓글 실패를 알린다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({
        items: [COMMENT],
        nextCursor: null,
      }),
      "GET /api/v1/posts/p1": json(post()),
      "GET /api/v1/me": json(ME),
      "POST /api/v1/posts/p1/comments": json(
        { error: { code: "X", message: "댓글 실패" } },
        500,
      ),
      "DELETE /api/v1/comments/m1": json(
        { error: { code: "X", message: "지우기 실패" } },
        500,
      ),
    });
    render(<PostScreen id="p1" />);
    await userEvent.type(await screen.findByLabelText("댓글 입력"), "a");
    await userEvent.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("댓글 실패")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "삭제" }));
    expect(await screen.findByText("지우기 실패")).toBeInTheDocument();
  });

  it("내 게시물은 내리면 만화함으로, 삭제하면 피드로 간다", async () => {
    const calls = mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(post({ authorId: "me" })),
      "GET /api/v1/me": json(ME),
      "DELETE /api/v1/posts/p1": noContent(),
    });
    render(<PostScreen id="p1" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "내리기" }),
    );
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "내리기",
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/comics");
    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "삭제",
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/");
    expect(
      calls.filter((c) => c.method === "DELETE").map((c) => c.url),
    ).toEqual([
      "/api/v1/posts/p1?mode=UNPUBLISH",
      "/api/v1/posts/p1?mode=DELETE",
    ]);
  });

  it("내리기가 실패하면 알린다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(post({ authorId: "me" })),
      "GET /api/v1/me": json(ME),
      "DELETE /api/v1/posts/p1": json(
        { error: { code: "X", message: "내리기 실패" } },
        500,
      ),
    });
    render(<PostScreen id="p1" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "내리기" }),
    );
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "내리기",
      }),
    );
    expect(await screen.findByText("내리기 실패")).toBeInTheDocument();
  });
});

describe("프로필과 팔로우 (FR-023)", () => {
  it("남의 프로필에서 팔로우하고 취소한다", async () => {
    mockFetch({
      "GET /api/v1/me": json(ME),
      "GET /api/v1/users/u2": json(OTHER),
      "GET /api/v1/follows/u2/stats": json({
        followers: 3,
        following: 1,
        followedByMe: false,
      }),
      "GET /api/v1/posts?authorId=u2": json({
        items: [post()],
        nextCursor: null,
      }),
      "PUT /api/v1/follows/u2": noContent(),
      "DELETE /api/v1/follows/u2": json(
        { error: { code: "X", message: "취소 실패" } },
        500,
      ),
    });
    render(<ProfileScreen userId="u2" />);
    expect(await screen.findByText("지수")).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole("button", { name: "팔로우" }),
    );
    expect(
      await screen.findByRole("button", { name: "팔로우 중" }),
    ).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "팔로우 중" }));
    expect(await screen.findByText("취소 실패")).toBeInTheDocument();
    expect(screen.getByAltText("오늘 있었던 일")).toHaveAttribute(
      "src",
      "/api/images/posts/p1?size=thumb",
    );
  });

  it("내 프로필에서 로그아웃하고 탈퇴한다", async () => {
    const toLogin = vi
      .spyOn(navigation, "toLogin")
      .mockImplementation(() => undefined);
    const calls = mockFetch({
      "GET /api/v1/me": json(ME),
      "GET /api/v1/users/me": json(ME),
      "GET /api/v1/follows/me/stats": json({
        followers: 0,
        following: 0,
        followedByMe: false,
      }),
      "GET /api/v1/posts?authorId=me": json({ items: [], nextCursor: null }),
      "POST /auth/logout": noContent(),
      "DELETE /api/v1/me": noContent(),
    });
    render(<MeScreen />);
    expect(
      await screen.findByText("아직 올린 만화가 없어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "팔로우" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(toLogin).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));
    await vi.waitFor(() => expect(toLogin).toHaveBeenCalledTimes(2));
    expect(
      calls.some((c) => c.method === "DELETE" && c.url === "/api/v1/me"),
    ).toBe(true);
  });

  it("탈퇴가 실패하면 알린다", async () => {
    mockFetch({
      "GET /api/v1/me": json(ME),
      "DELETE /api/v1/me": json(
        { error: { code: "X", message: "탈퇴 실패" } },
        500,
      ),
    });
    render(<MeScreen />);
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));
    expect(await screen.findByText("탈퇴 실패")).toBeInTheDocument();
  });
});
