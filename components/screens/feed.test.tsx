import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedScreen } from "./feed-screen";
import { InboxScreen } from "./inbox-screen";
import { navigation } from "@/lib/api";
import { comic, OTHER, post } from "@/test/screen";
import { json, mockFetch } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("피드 (FR-020)", () => {
  it("첫 컷과 제목, 작성자를 격자로 보여 주고 더 불러온다", async () => {
    const calls = mockFetch({
      "GET /api/v1/me": json({ id: "u1", nickname: "나", avatarUrl: null }),
      "GET /api/v1/feed?cursor=next": json({
        items: [post({ postId: "p2", title: "두 번째" })],
        nextCursor: null,
      }),
      "GET /api/v1/feed": json({ items: [post()], nextCursor: "next" }),
      "GET /api/v1/users": json({ items: [OTHER] }),
    });
    render(<FeedScreen />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "피드" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("편의점 대소동")).toBeInTheDocument();
    const link = (await screen.findByText("지수")).closest("a");
    expect(link).toHaveAttribute("href", "/@%EC%A7%80%EC%88%98");
    expect(link).toHaveAttribute("target", "_blank");
    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(await screen.findByText("두 번째")).toBeInTheDocument();
    expect(calls.some((c) => c.url === "/api/v1/users?ids=u2")).toBe(true);
  });

  it("비었으면 녹음하러 가는 안내를, 실패하면 오류를 보여 준다", async () => {
    mockFetch({ "GET /api/v1/feed": json({ items: [], nextCursor: null }) });
    render(<FeedScreen />);
    expect(
      await screen.findByText("아직 올라온 4컷이 없어요"),
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

  it("로그인하지 않았으면 서비스 소개와 최근 공개 4컷을 썸네일로 보여 준다", async () => {
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
    expect(await screen.findByText("방금 올라온 4컷")).toBeInTheDocument();
    // 4컷 전체 대신 첫 컷 썸네일과 제목, 작성자. 누르면 새 탭에서 작성자 페이지
    expect(await screen.findByText("편의점 대소동")).toBeInTheDocument();
    expect(screen.getByAltText("편의점 대소동")).toHaveAttribute(
      "src",
      "/api/images/posts/p1?size=thumb",
    );
    const link = (await screen.findByText("지수")).closest("a");
    expect(link).toHaveAttribute("href", "/@%EC%A7%80%EC%88%98");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.queryByText("오늘 있었던 일")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "주요 메뉴" }),
    ).not.toBeInTheDocument();
    expect(toLogin).not.toHaveBeenCalled();
  });

  it("공개 4컷이 아직 없으면 녹음하기는 로그인으로 보낸다", async () => {
    mockFetch({
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/feed": json({ items: [], nextCursor: null }),
    });
    render(<FeedScreen />);
    expect(
      await screen.findByRole("link", { name: "녹음하기" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByText("방금 올라온 4컷")).not.toBeInTheDocument();
  });
});

describe("스토리 (옛 만화함, FR-012)", () => {
  it("첫 컷과 제목을 2열로 보여 주고 게시한 것에는 배지를 단다", async () => {
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
    expect(screen.getByText("편의점 대소동").closest("a")).toHaveAttribute(
      "href",
      "/comics/c1",
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
