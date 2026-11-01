import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedScreen } from "./feed-screen";
import { InboxScreen } from "./inbox-screen";
import { navigation } from "@/lib/api";
import { comic, OTHER, post } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("피드 (FR-020)", () => {
  it("게시물과 작성자를 보여 주고 좋아요를 누른다", async () => {
    const calls = mockFetch({
      "GET /api/v1/feed?cursor=next": json({
        items: [post({ postId: "p2", caption: "", visibility: "FOLLOWERS" })],
        nextCursor: null,
      }),
      "GET /api/v1/feed": json({ items: [post()], nextCursor: "next" }),
      "GET /api/v1/users": json({ items: [OTHER] }),
      "PUT /api/v1/posts/p1/like": noContent(),
      "DELETE /api/v1/posts/p1/like": json({}, 500),
    });
    render(<FeedScreen />);
    expect(await screen.findByText("오늘 있었던 일")).toBeInTheDocument();
    expect(await screen.findAllByText("지수")).not.toHaveLength(0);
    const like = screen.getByRole("button", { name: "좋아요" });
    await userEvent.click(like);
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(like).toHaveTextContent("3");
    await userEvent.click(like);
    await waitFor(() => expect(like).toHaveAttribute("aria-pressed", "true"));
    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(await screen.findByLabelText("팔로워만")).toBeInTheDocument();
    expect(calls.some((c) => c.url === "/api/v1/users?ids=u2")).toBe(true);
  });

  it("비었으면 녹음하러 가는 안내를, 실패하면 오류를 보여 준다", async () => {
    mockFetch({ "GET /api/v1/feed": json({ items: [], nextCursor: null }) });
    render(<FeedScreen />);
    expect(
      await screen.findByText("아직 올라온 만화가 없어요"),
    ).toBeInTheDocument();
  });

  it("더 보기가 실패하면 오류를 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/feed?cursor": json(
        { error: { code: "X", message: "다음 쪽 실패" } },
        500,
      ),
      "GET /api/v1/feed": json({ items: [post()], nextCursor: "n" }),
    });
    render(<FeedScreen />);
    await userEvent.click(
      await screen.findByRole("button", { name: "더 보기" }),
    );
    expect(await screen.findByText("다음 쪽 실패")).toBeInTheDocument();
  });
});

describe("첫 화면 포털", () => {
  it("로그인 확인 중에는 서비스 이름만 보이고 피드 탭은 숨긴다", () => {
    mockFetch({ "GET /api/v1/me": () => new Promise<Response>(() => {}) });
    render(<FeedScreen />);
    expect(
      screen.getByRole("heading", { level: 1, name: "4cut story" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "주요 메뉴" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "서비스 소개" }),
    ).not.toBeInTheDocument();
  });

  it("캡션이 만화 제목과 같으면 다시 쓰지 않고, 만화 자리를 미리 잡는다", async () => {
    mockFetch({
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/feed": json({
        items: [post({ caption: "편의점 대소동" })],
        nextCursor: null,
      }),
    });
    render(<FeedScreen />);
    const image = await screen.findByAltText("편의점 대소동");
    expect(image).toHaveAttribute("width", "800");
    expect(image).toHaveAttribute("height", "3206");
    expect(screen.queryByText("편의점 대소동")).not.toBeInTheDocument();
  });

  it("로그인하지 않았으면 서비스 소개와 최근 공개 만화를 보여 준다", async () => {
    const toLogin = vi
      .spyOn(navigation, "toLogin")
      .mockImplementation(() => undefined);
    mockFetch({
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/feed": json({ items: [post()], nextCursor: null }),
      "GET /api/v1/users": json({ items: [OTHER] }),
    });
    render(<FeedScreen />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "4cut story" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "서비스 소개" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "무료로 시작하기" }),
    ).toHaveAttribute("href", "/login");
    expect(await screen.findByText("방금 올라온 만화")).toBeInTheDocument();
    expect(await screen.findByText("오늘 있었던 일")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "주요 메뉴" }),
    ).not.toBeInTheDocument();
    expect(toLogin).not.toHaveBeenCalled();
  });

  it("공개 만화가 아직 없으면 녹음하기는 로그인으로 보낸다", async () => {
    mockFetch({
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/feed": json({ items: [], nextCursor: null }),
    });
    render(<FeedScreen />);
    expect(
      await screen.findByRole("link", { name: "녹음하기" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByText("방금 올라온 만화")).not.toBeInTheDocument();
  });
});

describe("만화함 (FR-012)", () => {
  it("만화를 2열로 보여 주고 게시한 것에는 배지를 단다", async () => {
    mockFetch({
      "GET /api/v1/comics": json({
        items: [
          comic(),
          comic({ id: "c2", title: null, state: "POSTED", postId: "p1" }),
        ],
        nextCursor: null,
      }),
    });
    render(<InboxScreen />);
    expect(await screen.findByText("게시됨")).toBeInTheDocument();
    expect(screen.getByText("제목 없음")).toBeInTheDocument();
    expect(screen.getByAltText("편의점 대소동")).toHaveAttribute(
      "src",
      "/api/images/comics/c1?size=thumb",
    );
  });

  it("비었으면 안내, 실패하면 오류", async () => {
    mockFetch({ "GET /api/v1/comics": json({ items: [], nextCursor: null }) });
    render(<InboxScreen />);
    expect(
      await screen.findByText("첫 대화를 녹음해 보세요"),
    ).toBeInTheDocument();
  });

  it("불러오지 못하면 오류 코드와 함께 알린다", async () => {
    mockFetch({
      "GET /api/v1/comics": json(
        { error: { code: "INTERNAL", message: "불러오지 못했어요." } },
        500,
      ),
    });
    render(<InboxScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "불러오지 못했어요.(INTERNAL)",
    );
  });
});
