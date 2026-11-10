import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductionStatus } from "./production-status";
import {
  countGroups,
  sourceLabel,
  statusGroup,
  statusHref,
  statusLabel,
} from "@/lib/conversation-status";
import type { ConversationStatus } from "@/lib/types";
import { json, mockFetch } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: "v1",
    source: "RECORDING",
    status: "DRAWING",
    stage: "DRAWING",
    progress: 60,
    retries: 0,
    failureReason: null,
    comicId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("만드는 현황 규칙", () => {
  it("상태를 진행 중·완료·못 만듦으로 묶는다", () => {
    const all: ConversationStatus[] = [
      "RECORDING",
      "QUEUED",
      "TRANSCRIBING",
      "SELECTING",
      "SCRIPTING",
      "DRAWING",
      "COMPOSING",
      "GPU_WAITING",
      "DONE",
      "FAILED",
      "NO_SCENE",
    ];
    expect(countGroups(all.map((status) => ({ status })))).toEqual({
      active: 8,
      done: 1,
      failed: 2,
    });
    for (const status of all) {
      expect(statusLabel({ status, source: "RECORDING" })).not.toBe(status);
    }
    expect(statusLabel({ status: "TRANSCRIBING", source: "ARTICLE" })).toBe(
      "기사 읽는 중",
    );
    expect(statusGroup({ status: "GPU_WAITING" })).toBe("active");
    expect(sourceLabel({ source: "UPLOAD" })).toBe("녹음 파일");
    expect(sourceLabel({ source: "ARTICLE" })).toBe("기사");
    expect(statusHref({ id: "v1", status: "DONE", comicId: "c1" })).toBe(
      "/comics/c1",
    );
    expect(statusHref({ id: "v1", status: "DONE", comicId: null })).toBe(
      "/conversations/v1",
    );
  });
});

describe("내 프로필 만드는 현황", () => {
  it("진행 중인 것을 먼저 보여 주고 묶음별로 고른다", async () => {
    mockFetch({
      "GET /api/v1/conversations?size=50&cursor=n": json({
        items: [conversation({ id: "v4", status: "DONE", comicId: "c4" })],
        nextCursor: null,
      }),
      "GET /api/v1/conversations?size=50": json({
        items: [
          conversation({
            id: "v1",
            source: "ARTICLE",
            sourceTitle: "시장 이야기",
          }),
          conversation({ id: "v2", status: "DONE", comicId: "c2" }),
          conversation({ id: "v3", status: "FAILED", source: "UPLOAD" }),
        ],
        nextCursor: "n",
      }),
    });
    render(<ProductionStatus />);
    expect(await screen.findByText("시장 이야기")).toBeInTheDocument();
    expect(
      screen.getByText("최근 3개 기준 · 나에게만 보여요"),
    ).toBeInTheDocument();
    const active = screen.getByRole("button", { name: /진행 중/ });
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(active).toHaveTextContent("1");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "60",
    );
    expect(screen.getByRole("link", { name: /시장 이야기/ })).toHaveAttribute(
      "href",
      "/conversations/v1",
    );
    expect(screen.queryByText("녹음 파일로 만든 4컷")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /못 만듦/ }));
    expect(screen.getByText("녹음 파일로 만든 4컷")).toBeInTheDocument();
    expect(screen.getByText("만들지 못함")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /완료/ }));
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("link")).toHaveLength(1);
    expect(within(list).getByRole("link")).toHaveAttribute(
      "href",
      "/comics/c2",
    );

    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(await screen.findAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /전체/ })).toHaveTextContent("4");
    expect(screen.getByText("나에게만 보여요")).toBeInTheDocument();
  });

  it("진행 중인 것이 있으면 5초마다 다시 확인한다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let round = 0;
    mockFetch({
      "GET /api/v1/conversations": () => {
        round += 1;
        return json({
          items: [
            round === 1
              ? conversation()
              : conversation({ status: "DONE", comicId: "c1" }),
          ],
          nextCursor: null,
        });
      },
    });
    render(<ProductionStatus />);
    expect(await screen.findByText("그리는 중")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await screen.findByText("완성")).toBeInTheDocument();
    // 다 끝났으니 더는 묻지 않는다
    await vi.advanceTimersByTimeAsync(15000);
    expect(round).toBe(2);
    // 진행 중이 없으면 전체를 보여 준다
    expect(screen.getByRole("button", { name: /전체/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    vi.useRealTimers();
  });

  it("비었으면 안내하고, 실패하면 오류를 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/conversations": json({ items: [], nextCursor: null }),
    });
    const { unmount } = render(<ProductionStatus />);
    expect(
      await screen.findByText("아직 등록한 녹음이나 기사가 없어요."),
    ).toBeInTheDocument();
    unmount();
    mockFetch({
      "GET /api/v1/conversations": json(
        { error: { code: "INTERNAL", message: "문제가 생겼어요" } },
        500,
      ),
    });
    render(<ProductionStatus />);
    expect(await screen.findByText(/문제가 생겼어요/)).toBeInTheDocument();
  });
});
