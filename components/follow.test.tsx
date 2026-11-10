import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FollowList } from "./follow-list";
import { FeedScreen } from "./screens/feed-screen";
import { PostScreen } from "./screens/post-screen";
import { navigation } from "@/lib/api";
import { ME, OTHER, post, router } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const STATS = {
  followers: 3,
  following: 1,
  followedByMe: false,
  posts: 1,
  likes: 0,
};

const POST_ROUTES = {
  "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
  "GET /api/v1/posts/p1": json(post()),
  "GET /api/v1/users": json({ items: [OTHER, ME] }),
};

describe("만화에서 작성자 팔로우 (002 FR-017)", () => {
  it("게시물 상세 작성자 옆에서 팔로우하고 취소한다", async () => {
    const calls = mockFetch({
      ...POST_ROUTES,
      "GET /api/v1/me": json(ME),
      "GET /api/v1/follows/u2/stats": json(STATS),
      "PUT /api/v1/follows/u2": noContent(),
      "DELETE /api/v1/follows/u2": noContent(),
    });
    render(<PostScreen id="p1" />);
    const button = await screen.findByRole("button", { name: "팔로우" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(
      await screen.findByRole("button", { name: "팔로우 중" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(calls.some((c) => c.method === "PUT")).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "팔로우 중" }));
    expect(
      await screen.findByRole("button", { name: "팔로우" }),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.method === "DELETE")).toBe(true);
  });

  it("실패하면 원래 상태로 되돌린다", async () => {
    mockFetch({
      ...POST_ROUTES,
      "GET /api/v1/me": json(ME),
      "GET /api/v1/follows/u2/stats": json({ ...STATS, followedByMe: true }),
      "DELETE /api/v1/follows/u2": json(
        { error: { code: "X", message: "실패" } },
        500,
      ),
    });
    render(<PostScreen id="p1" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "팔로우 중" }),
    );
    expect(
      await screen.findByRole("button", { name: "팔로우 중" }),
    ).toHaveAttribute("title", "다시 눌러 주세요");
  });

  it("로그인하지 않았으면 팔로우를 누를 때 로그인으로 보낸다", async () => {
    const toLogin = vi
      .spyOn(navigation, "toLogin")
      .mockImplementation(() => {});
    mockFetch({ ...POST_ROUTES, "GET /api/v1/me": json({}, 401) });
    render(<PostScreen id="p1" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "팔로우" }),
    );
    expect(toLogin).toHaveBeenCalled();
  });

  it("내 게시물에는 팔로우 버튼이 없다", async () => {
    mockFetch({
      ...POST_ROUTES,
      "GET /api/v1/posts/p1": json(post({ authorId: "me" })),
      "GET /api/v1/me": json(ME),
    });
    render(<PostScreen id="p1" />);
    expect(
      await screen.findByRole("button", { name: "내리기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "팔로우" }),
    ).not.toBeInTheDocument();
  });
});

describe("팔로워·팔로잉 목록 (002 FR-018)", () => {
  it("목록을 보여 주고, 나에게는 버튼이 없고, 닫는다", async () => {
    mockFetch({
      "GET /api/v1/follows/u2/followers": json({
        items: [
          {
            userId: "me",
            followedAt: "2026-11-10T00:00:00Z",
            followedByMe: false,
          },
          {
            userId: "u3",
            followedAt: "2026-11-09T00:00:00Z",
            followedByMe: true,
          },
        ],
        nextCursor: null,
      }),
      "GET /api/v1/users": json({
        items: [ME, { id: "u3", nickname: "민호", avatarUrl: null }],
      }),
    });
    const onClose = vi.fn();
    render(
      <FollowList
        userId="u2"
        kind="followers"
        viewerId="me"
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "팔로워" });
    expect(
      await within(dialog).findByRole("link", { name: /민호/ }),
    ).toHaveAttribute("href", "/@%EB%AF%BC%ED%98%B8");
    expect(
      within(dialog).getByRole("link", { name: /마르코/ }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole("button", { name: /팔로우/ }),
    ).toHaveLength(1);
    expect(
      within(dialog).getByRole("button", { name: "팔로우 중" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("비었으면 안내하고, 실패하면 오류를 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/follows/u2/following": json({ items: [], nextCursor: null }),
      "GET /api/v1/follows/u3/following": json(
        { error: { code: "X", message: "목록 실패" } },
        500,
      ),
    });
    const { unmount } = render(
      <FollowList
        userId="u2"
        kind="following"
        viewerId={null}
        onClose={() => {}}
      />,
    );
    expect(
      await screen.findByText("아직 팔로우한 사람이 없어요."),
    ).toBeInTheDocument();
    unmount();
    render(
      <FollowList
        userId="u3"
        kind="following"
        viewerId={null}
        onClose={() => {}}
      />,
    );
    expect(await screen.findByText("목록 실패")).toBeInTheDocument();
  });
});

describe("피드 전체/팔로잉 탭 (002 FR-019)", () => {
  it("팔로잉 탭은 내가 팔로우한 사람의 4컷만 불러오고, 비었으면 안내한다", async () => {
    const calls = mockFetch({
      "GET /api/v1/me": json(ME),
      "GET /api/v1/feed?scope=following": json({ items: [], nextCursor: null }),
      "GET /api/v1/feed": json({ items: [post()], nextCursor: null }),
      "GET /api/v1/users": json({ items: [OTHER] }),
    });
    render(<FeedScreen />);
    const tabs = await screen.findByRole("group", { name: "피드 범위" });
    expect(within(tabs).getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(within(tabs).getByRole("button", { name: "팔로잉" }));
    expect(
      await screen.findByText("팔로우한 사람의 4컷이 아직 없어요"),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.url === "/api/v1/feed?scope=following")).toBe(
      true,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "전체 4컷 보기" }),
    );
    expect(within(tabs).getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("로그인하지 않았으면 탭이 없다", async () => {
    mockFetch({
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/feed": json({ items: [post()], nextCursor: null }),
    });
    render(<FeedScreen />);
    expect(
      await screen.findByText("누구나 볼 수 있게 올라온 최신 4컷이에요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "피드 범위" }),
    ).not.toBeInTheDocument();
  });
});
