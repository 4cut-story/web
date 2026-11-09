import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MeScreen } from "./me-screen";
import { PostScreen } from "./post-screen";
import { ProfileScreen } from "./profile-screen";
import { UserPageScreen } from "./user-page-screen";
import { navigation } from "@/lib/api";
import { ME, OTHER, post, router } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  router.push.mockReset();
  router.replace.mockReset();
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

  it("내 게시물은 내리면 스토리로, 삭제하면 피드로 간다", async () => {
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

  it("로그인하지 않았으면 게시물과 댓글을 보고, 댓글은 로그인 안내를 받는다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({
        items: [COMMENT],
        nextCursor: null,
      }),
      "GET /api/v1/posts/p1": json(post()),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    expect(await screen.findByText("재밌다")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "로그인하고 댓글 달기" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("댓글 입력")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "첫 화면으로" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      (await screen.findAllByRole("link", { name: /지수/ }))[0],
    ).toHaveAttribute("href", "/@%EC%A7%80%EC%88%98");
  });

  it("만화 아래에 등장인물(그림·호칭·이름)과 그림체·사투리를 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(
        post({
          cast: [
            { role: "할머니", name: "하늘", lookId: "l1" },
            { role: "손녀", name: "도윤", lookId: null, portrait: true },
            { role: "친구", name: "시온", lookId: null },
          ],
          concept: "WATERCOLOR",
          dialect: "GYEONGSANG",
        }),
      ),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    const cast = await screen.findByRole("region", { name: "등장인물" });
    expect(within(cast).getByText("할머니")).toBeInTheDocument();
    expect(within(cast).getByText("하늘")).toBeInTheDocument();
    expect(
      within(cast).getByRole("img", { name: "할머니 하늘" }),
    ).toHaveAttribute("src", expect.stringContaining("/api/images/looks/l1"));
    // 캐릭터를 못 찾은 인물은 만화 컷에서 잘라 낸 얼굴 그림, 그것도 없으면 회색 칸
    expect(
      within(cast).getByRole("img", { name: "손녀 도윤" }),
    ).toHaveAttribute("src", "/api/images/posts/p1?cast=1");
    expect(
      within(cast).queryByRole("img", { name: "친구 시온" }),
    ).not.toBeInTheDocument();
    expect(within(cast).getByText("수채화 애니메이션")).toBeInTheDocument();
    expect(within(cast).getByText("경상도")).toBeInTheDocument();
  });

  it("등장인물 아래에 제작 정보(전체 시간, 그림 모델, 단계별 시간)를 보여 준다 (FR-006)", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(
        post({
          cast: [{ role: "할머니", name: "하늘", lookId: null }],
          production: {
            version: 1,
            totalMs: 95_000,
            steps: [
              {
                step: "DRAW",
                ms: 41_000,
                attempts: 1,
                jobs: [
                  {
                    type: "IMAGE",
                    runMs: 40_000,
                    info: {
                      flux: "black-forest-labs/FLUX.1-schnell",
                      quantization: "nf4",
                      steps: 4,
                      panels: [{ ms: 8000 }],
                    },
                  },
                ],
              },
            ],
            preTranscribe: { parts: 3, runMs: 6000 },
          },
        }),
      ),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    const info = await screen.findByRole("region", { name: "제작 정보" });
    const cast = screen.getByRole("region", { name: "등장인물" });
    expect(
      cast.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(info).getByText("1분 35초")).toBeInTheDocument();
    expect(within(info).getAllByText("FLUX.1-schnell NF4 4bit")).toHaveLength(
      2,
    );
    expect(within(info).getByText("컷 그리기")).toBeInTheDocument();
    expect(within(info).getByText("41초")).toBeInTheDocument();
    expect(within(info).getByText(/컷 1장, 컷당 평균 8초/)).toBeInTheDocument();
    expect(
      within(info).getByText("녹음 중 미리 받아쓰기 3번"),
    ).toBeInTheDocument();
  });

  it("예전 게시물은 제작 정보가 없다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(post({ production: null })),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    expect(await screen.findByText("오늘 있었던 일")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "제작 정보" })).toBeNull();
  });

  it("만화 바로 아래, 등장인물 위에 줄거리 요약을 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(
        post({
          summary:
            "손녀가 할머니의 빈 접시를 보고 범인을 찾는다. 결국 할머니가 먹은 것이 들통난다.",
          cast: [{ role: "할머니", name: "하늘", lookId: null }],
        }),
      ),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    const story = await screen.findByRole("region", { name: "줄거리" });
    expect(story).toHaveTextContent("결국 할머니가 먹은 것이 들통난다.");
    const cast = screen.getByRole("region", { name: "등장인물" });
    expect(
      story.compareDocumentPosition(cast) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("예전 게시물은 줄거리 요약이 없다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(post({ summary: null })),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    expect(await screen.findByText("오늘 있었던 일")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "줄거리" })).toBeNull();
  });

  it("라이브 정보가 있는 게시물은 라이브 모드로 볼 수 있다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1/live": json({
        version: 1,
        panels: [
          {
            index: 1,
            role: "기",
            image: "panels/1.png",
            durationMs: 3500,
            sound: null,
            motion: null,
          },
        ],
      }),
      "GET /api/v1/posts/p1": json(post({ live: true })),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "라이브" }),
    );
    expect(await screen.findByAltText("편의점 대소동 1컷")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "만화보기" }));
    expect(screen.getByAltText("오늘 있었던 일")).toBeInTheDocument();
  });

  it("예전 게시물은 등장인물 소개가 없다", async () => {
    mockFetch({
      "GET /api/v1/posts/p1/comments": json({ items: [], nextCursor: null }),
      "GET /api/v1/posts/p1": json(post()),
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users": json({ items: [OTHER, ME] }),
    });
    render(<PostScreen id="p1" />);
    expect(await screen.findByText("오늘 있었던 일")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "등장인물" }),
    ).not.toBeInTheDocument();
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

describe("사용자 페이지 /@닉네임 (FR-023)", () => {
  const STATS = { followers: 3, following: 1, followedByMe: false };

  it("남의 페이지에서 팔로우하고 취소한다", async () => {
    mockFetch({
      "GET /api/v1/me": json(ME),
      "GET /api/v1/users/lookup?nickname=%EC%A7%80%EC%88%98": json(OTHER),
      "GET /api/v1/users/u2": json(OTHER),
      "GET /api/v1/follows/u2/stats": json(STATS),
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
    render(<UserPageScreen nickname="지수" />);
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
    expect(
      screen.queryByRole("link", { name: "녹음해서 4컷 만들기" }),
    ).not.toBeInTheDocument();
  });

  it("로그인하지 않았으면 4컷만 보이고 팔로우 대신 로그인 버튼이 있다", async () => {
    const toLogin = vi
      .spyOn(navigation, "toLogin")
      .mockImplementation(() => undefined);
    mockFetch({
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users/lookup": json(OTHER),
      "GET /api/v1/users/u2": json(OTHER),
      "GET /api/v1/follows/u2/stats": json(STATS),
      "GET /api/v1/posts?authorId=u2": json({
        items: [post()],
        nextCursor: null,
      }),
    });
    render(<UserPageScreen nickname="지수" />);
    expect(await screen.findByAltText("오늘 있었던 일")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.queryByRole("button", { name: "팔로우" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "주요 메뉴" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "첫 화면으로" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(toLogin).not.toHaveBeenCalled();
  });

  it("없는 닉네임이면 알린다", async () => {
    mockFetch({
      "GET /api/v1/me": json({}, 401),
      "GET /api/v1/users/lookup": json(
        { error: { code: "NOT_FOUND", message: "찾을 수 없어요." } },
        404,
      ),
    });
    render(<UserPageScreen nickname="없는사람" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "없는 사용자예요",
    );
  });

  it("다른 오류는 그 문구를 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/me": json(ME),
      "GET /api/v1/users/lookup": json(
        { error: { code: "INTERNAL", message: "잠시 문제" } },
        500,
      ),
    });
    render(<UserPageScreen nickname="지수" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("잠시 문제");
  });

  it("내 페이지에서는 주소 복사, 개인 토큰 관리, 로그아웃, 탈퇴를 하고, 게시한 4컷이 없으면 스토리로 안내한다", async () => {
    const toLogin = vi
      .spyOn(navigation, "toLogin")
      .mockImplementation(() => undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const calls = mockFetch({
      "GET /api/v1/me": json(ME),
      "GET /api/v1/users/lookup": json(ME),
      "GET /api/v1/users/me": json({
        ...ME,
        joinedAt: "2026-03-14T01:00:00Z",
      }),
      "GET /api/v1/follows/me/stats": json({
        ...STATS,
        posts: 0,
        likes: 0,
        comics: 3,
      }),
      "GET /api/v1/posts?authorId=me": json({ items: [], nextCursor: null }),
      "POST /auth/logout": noContent(),
      "DELETE /api/v1/me": noContent(),
    });
    render(<UserPageScreen nickname="마르코" />);
    expect(
      await screen.findByText(/아직 게시한 4컷이 없어요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "스토리로 가기" })).toHaveAttribute(
      "href",
      "/comics",
    );
    expect(
      await screen.findByText(
        (_, el) =>
          el?.tagName === "P" &&
          el.textContent === "2026년 3월 가입 · 만든 4컷 3개 · 게시 안 함 3개",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("게시물")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "팔로우" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "주소 복사" }));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/@%EB%A7%88%EB%A5%B4%EC%BD%94`,
    );
    expect(
      await screen.findByRole("button", { name: "복사했어요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인 토큰" })).toHaveAttribute(
      "href",
      "/me/tokens",
    );
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

  it("탈퇴나 주소 복사가 실패하면 알린다", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
      configurable: true,
    });
    mockFetch({
      "GET /api/v1/me": json(ME),
      "GET /api/v1/users/lookup": json(ME),
      "DELETE /api/v1/me": json(
        { error: { code: "X", message: "탈퇴 실패" } },
        500,
      ),
    });
    render(<UserPageScreen nickname="마르코" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "주소 복사" }),
    );
    expect(
      await screen.findByText("주소를 복사하지 못했어요."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    await userEvent.click(screen.getByRole("button", { name: "탈퇴" }));
    expect(await screen.findByText("탈퇴 실패")).toBeInTheDocument();
  });
});

describe("내 프로필 탭과 예전 프로필 주소", () => {
  it("/me는 내 페이지 주소로 보낸다", async () => {
    mockFetch({ "GET /api/v1/me": json(ME) });
    render(<MeScreen />);
    await vi.waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        "/@%EB%A7%88%EB%A5%B4%EC%BD%94",
      ),
    );
  });

  it("/me가 실패하면 알린다", async () => {
    mockFetch({
      "GET /api/v1/me": json({ error: { code: "X", message: "실패" } }, 500),
    });
    render(<MeScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent("실패");
  });

  it("/users/ID는 그 사용자의 페이지 주소로 보낸다", async () => {
    mockFetch({ "GET /api/v1/users/u2": json(OTHER) });
    render(<ProfileScreen userId="u2" />);
    await vi.waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/@%EC%A7%80%EC%88%98"),
    );
  });

  it("없는 사용자면 알린다", async () => {
    mockFetch({
      "GET /api/v1/users/u9": json(
        { error: { code: "NOT_FOUND", message: "찾을 수 없어요." } },
        404,
      ),
    });
    render(<ProfileScreen userId="u9" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "찾을 수 없어요.",
    );
  });
});
