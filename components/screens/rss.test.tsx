import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RssScreen } from "./rss-screen";
import type { RssFeed } from "@/lib/types";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FEED: RssFeed = {
  id: "f1",
  url: "https://news.example.com/rss",
  title: "예시신문 전체기사",
  siteUrl: "https://news.example.com/",
  autoPublish: false,
  enabled: true,
  concept: "AUTO",
  dialect: "NONE",
  lastCheckedAt: "2026-11-10T03:00:00Z",
  lastError: null,
  made: 2,
  createdAt: "2026-11-10T02:00:00Z",
  recent: [
    {
      title: "떡집의 마지막 날",
      link: "https://news.example.com/a/1",
      status: "MADE",
      reason: null,
      conversationId: "c1",
      createdAt: "2026-11-10T03:00:00Z",
    },
    {
      title: "다른 신문의 떡집 기사",
      link: "https://other.example.com/a/9",
      status: "SIMILAR",
      reason:
        "최근에 만든 기사와 주제가 비슷해서 건너뛰었어요: 떡집의 마지막 날",
      conversationId: null,
      createdAt: "2026-11-10T03:00:00Z",
    },
  ],
};

describe("RSS 구독 (004)", () => {
  it("FR-050·FR-052: 주소와 공개 방식, 그림체를 보내 등록하고 목록 맨 위에 넣는다. 기본은 확인 후 공개", async () => {
    const calls = mockFetch({
      "GET /api/v1/rss-feeds": json({ items: [] }),
      "POST /api/v1/rss-feeds": json({ ...FEED, recent: [] }, 201),
    });
    render(<RssScreen />);
    expect(
      await screen.findByText("아직 구독한 피드가 없어요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "확인 후 공개" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByText(/주제가 비슷하면 건너뛰어요/)).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText("RSS 주소"),
      " https://news.example.com/rss ",
    );
    await userEvent.click(screen.getByRole("radio", { name: "바로 공개" }));
    await userEvent.click(screen.getByRole("radio", { name: /신문/ }));
    await userEvent.click(screen.getByRole("button", { name: "구독하기" }));

    expect(await screen.findByText("예시신문 전체기사")).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST");
    expect(JSON.parse(String(post?.init?.body))).toEqual({
      url: "https://news.example.com/rss",
      autoPublish: true,
      concept: "NEWSPAPER",
      dialect: "NONE",
    });
    expect(screen.getByLabelText("RSS 주소")).toHaveValue("");
  });

  it("FR-051: http(s)가 아닌 주소는 보내지 않고, 서버가 거절하면 이유를 보여 준다", async () => {
    const calls = mockFetch({
      "GET /api/v1/rss-feeds": json({ items: [] }),
      "POST /api/v1/rss-feeds": json(
        {
          error: {
            code: "RSS_UNREADABLE",
            message:
              "RSS나 Atom 피드가 아니에요. 사이트의 RSS 주소를 넣어 주세요.",
          },
        },
        422,
      ),
    });
    render(<RssScreen />);
    await screen.findByText("아직 구독한 피드가 없어요.");
    const input = screen.getByLabelText("RSS 주소");
    await userEvent.type(input, "ftp://x");
    await userEvent.click(screen.getByRole("button", { name: "구독하기" }));
    expect(screen.getByText(/http나 https로 시작하는/)).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);

    await userEvent.clear(input);
    await userEvent.type(input, "https://news.example.com/");
    await userEvent.click(screen.getByRole("button", { name: "구독하기" }));
    expect(
      await screen.findByText(/RSS나 Atom 피드가 아니에요/),
    ).toBeInTheDocument();
  });

  it("FR-065·FR-066·FR-068: 목록에 공개 방식·만든 수·최근 기사(비슷해서 건너뜀 포함)를 보이고, 바꾸기·끄기·지금 확인·지우기를 한다", async () => {
    const calls = mockFetch({
      "GET /api/v1/rss-feeds": json({ items: [FEED] }),
      "PUT /api/v1/rss-feeds/f1": (init) =>
        json({ ...FEED, ...JSON.parse(String(init?.body)) }),
      "POST /api/v1/rss-feeds/f1/check": json(FEED, 202),
      "DELETE /api/v1/rss-feeds/f1": noContent(),
    });
    render(<RssScreen />);
    const card = (await screen.findByText("예시신문 전체기사")).closest(
      "article",
    )!;
    const inCard = within(card as HTMLElement);
    expect(inCard.getByText(/확인 후 공개 · 만든 4컷 2개/)).toBeInTheDocument();
    expect(
      inCard.getByRole("link", { name: "떡집의 마지막 날" }),
    ).toHaveAttribute("href", "/conversations/c1");
    expect(
      inCard.getByText(/비슷해서 건너뜀 · 최근에 만든 기사와/),
    ).toBeInTheDocument();

    await userEvent.click(
      inCard.getByRole("button", { name: "바로 공개로 바꾸기" }),
    );
    expect(
      await inCard.findByRole("button", { name: "확인 후 공개로 바꾸기" }),
    ).toBeInTheDocument();
    const put = calls.find((c) => c.method === "PUT");
    expect(JSON.parse(String(put?.init?.body))).toEqual({
      autoPublish: true,
      enabled: true,
      concept: "AUTO",
      dialect: "NONE",
    });

    await userEvent.click(inCard.getByRole("button", { name: "끄기" }));
    expect(await inCard.findByText(/꺼 둠/)).toBeInTheDocument();
    expect(inCard.getByRole("button", { name: "지금 확인" })).toBeDisabled();
    await userEvent.click(inCard.getByRole("button", { name: "켜기" }));
    await vi.waitFor(() =>
      expect(inCard.getByRole("button", { name: "지금 확인" })).toBeEnabled(),
    );

    await userEvent.click(inCard.getByRole("button", { name: "지금 확인" }));
    expect(await inCard.findByText(/지금 확인하고 있어요/)).toBeInTheDocument();

    await userEvent.click(inCard.getByRole("button", { name: "지우기" }));
    expect(
      await screen.findByText("아직 구독한 피드가 없어요."),
    ).toBeInTheDocument();
  });

  it("FR-060: 피드를 읽지 못한 이유와 아직 확인하지 않은 상태를 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/rss-feeds": json({
        items: [
          {
            ...FEED,
            lastCheckedAt: null,
            lastError: "기사를 불러오지 못했어요.",
            recent: [
              {
                ...FEED.recent[0],
                title: null,
                conversationId: null,
                status: "FAILED",
                reason: "본문 없음",
              },
            ],
          },
        ],
      }),
    });
    render(<RssScreen />);
    expect(
      await screen.findByText("기사를 불러오지 못했어요."),
    ).toBeInTheDocument();
    expect(screen.getByText(/곧 확인해요/)).toBeInTheDocument();
    expect(
      screen.getByText("https://news.example.com/a/1"),
    ).toBeInTheDocument();
    expect(screen.getByText(/만들지 못함 · 본문 없음/)).toBeInTheDocument();
  });

  it("목록을 불러오지 못하면 알린다", async () => {
    mockFetch({
      "GET /api/v1/rss-feeds": json(
        { error: { code: "INTERNAL", message: "잠시 뒤 다시 해 주세요." } },
        500,
      ),
    });
    render(<RssScreen />);
    expect(
      await screen.findByText(/잠시 뒤 다시 해 주세요/),
    ).toBeInTheDocument();
  });
});
