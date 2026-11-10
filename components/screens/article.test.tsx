import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArticleScreen, looksLikeUrl } from "./article-screen";
import { POLL_MS, ProgressScreen } from "./progress-screen";
import { ComicSource, safeHttpUrl } from "@/components/comic-source";
import { router } from "@/test/screen";
import { json, mockFetch } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  router.push.mockReset();
});

const URL_ = "https://news.example.com/article/1";

async function fill(url: string) {
  await userEvent.type(screen.getByLabelText("기사 주소"), url);
  await userEvent.click(screen.getByRole("button", { name: "4컷으로 만들기" }));
}

describe("기사로 만들기", () => {
  it("기사 주소를 보내면 서버가 읽고 진행 화면으로 간다", async () => {
    const calls = mockFetch({
      "POST /api/v1/conversations": json(
        { id: "a1", status: "TRANSCRIBING" },
        201,
      ),
    });
    render(<ArticleScreen />);
    expect(
      screen.getByText(/사실만 가져오고, 이야기·인물·대사는 새로/),
    ).toBeInTheDocument();
    expect(screen.getByText(/출처: 언론사명/)).toBeInTheDocument();
    await fill(URL_);
    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/conversations/a1"),
    );
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      source: "ARTICLE",
      url: URL_,
    });
  });

  it("고른 그림체와 사투리를 함께 보낸다", async () => {
    const calls = mockFetch({
      "POST /api/v1/conversations": json({ id: "a2" }, 201),
    });
    render(<ArticleScreen />);
    await userEvent.click(screen.getByRole("radio", { name: /신문/ }));
    await fill(URL_);
    await vi.waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      source: "ARTICLE",
      concept: "NEWSPAPER",
    });
  });

  it("기사를 읽지 못하면 서버가 준 이유를 보여 주고 다시 넣게 한다", async () => {
    mockFetch({
      "POST /api/v1/conversations": json(
        {
          error: {
            code: "ARTICLE_UNREADABLE",
            message:
              "기사 본문을 찾지 못했어요. 유료 기사나 로그인이 필요한 페이지는 만들 수 없어요.",
          },
        },
        422,
      ),
    });
    render(<ArticleScreen />);
    await fill(URL_);
    expect(
      await screen.findByText(/로그인이 필요한 페이지는 만들 수 없어요/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "4컷으로 만들기" }),
    ).toBeEnabled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("http·https 주소가 아니면 보내지 않는다", async () => {
    const calls = mockFetch({});
    render(<ArticleScreen />);
    // type="url" 입력의 브라우저 검사를 건너뛰고 화면 검사를 본다
    const input = screen.getByLabelText("기사 주소");
    input.removeAttribute("type");
    input.removeAttribute("required");
    await fill("ftp://example.com/a");
    expect(
      await screen.findByText(/http나 https로 시작하는/),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(looksLikeUrl("javascript:alert(1)")).toBe(false);
    expect(looksLikeUrl("그냥 글")).toBe(false);
    expect(looksLikeUrl(" http://a.example.com ")).toBe(true);
  });

  it("진행 화면은 기사 제목과 기사 단계 이름을 보여 주고, 실패하면 다른 기사로 만들게 한다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const base = {
      source: "ARTICLE",
      progress: 10,
      retries: 0,
      failureReason: null,
      comicId: null,
      createdAt: "2026-11-09T00:00:00Z",
      sourceUrl: URL_,
      sourceTitle: "30년 떡집의 마지막 날",
    };
    mockFetch({
      "GET /api/v1/conversations/a1": json({
        ...base,
        id: "a1",
        status: "TRANSCRIBING",
        stage: "TRANSCRIBING",
      }),
      "GET /api/v1/conversations/a2": json({
        ...base,
        id: "a2",
        status: "FAILED",
        stage: "TRANSCRIBING",
      }),
      "GET /api/v1/conversations/a3": json({
        ...base,
        id: "a3",
        status: "NO_SCENE",
        stage: "SELECTING",
      }),
    });
    const first = render(<ProgressScreen id="a1" />);
    expect(
      await screen.findByText("기사 읽고 대화로 바꾸는 중"),
    ).toBeInTheDocument();
    expect(screen.getByText("30년 떡집의 마지막 날")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    first.unmount();
    const second = render(<ProgressScreen id="a2" />);
    expect(
      await screen.findByText(/다른 기사로 해 주세요/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "다른 기사로 만들기" }),
    ).toHaveAttribute("href", "/article");
    second.unmount();
    render(<ProgressScreen id="a3" />);
    expect(
      await screen.findByText(/이 기사에서는 4컷으로 만들 만한 장면을/),
    ).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe("원문 기사 출처", () => {
  const production = {
    version: 1,
    steps: [],
    source: {
      type: "ARTICLE" as const,
      url: URL_,
      title: "30년 떡집의 마지막 날",
      site: "예시신문",
    },
  };

  it("기사로 만든 만화는 '출처: 언론사명' 한 줄로 원문 링크를 새 창으로 열고, 기사 제목은 보이지 않는다", () => {
    const { container } = render(<ComicSource production={production} />);
    expect(container).toHaveTextContent(/^출처: 예시신문$/);
    const link = screen.getByRole("link", { name: "예시신문" });
    expect(link).toHaveAttribute("href", URL_);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(container).not.toHaveTextContent("30년 떡집의 마지막 날");
  });

  it("제목·사이트가 없으면 주소의 호스트를 쓰고, 녹음 만화나 이상한 주소는 그리지 않는다", () => {
    const { container, unmount } = render(
      <ComicSource
        production={{
          ...production,
          source: { type: "ARTICLE", url: URL_, title: null, site: null },
        }}
      />,
    );
    expect(container).toHaveTextContent("news.example.com");
    unmount();
    const empty = render(
      <ComicSource production={{ version: 1, steps: [] }} />,
    );
    expect(empty.container).toBeEmptyDOMElement();
    empty.unmount();
    const bad = render(
      <ComicSource
        production={{
          ...production,
          source: { ...production.source, url: "javascript:alert(1)" },
        }}
      />,
    );
    expect(bad.container).toBeEmptyDOMElement();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl("::bad")).toBeNull();
  });
});
