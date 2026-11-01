import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecordScreen } from "./record-screen";
import { router } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

class FakeRecorder {
  static last: FakeRecorder;
  static isTypeSupported = (t: string) => t === "audio/webm;codecs=opus";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    readonly stream: unknown,
    readonly options: { mimeType: string },
  ) {
    FakeRecorder.last = this;
  }
  start = vi.fn();
  stop() {
    this.ondataavailable?.({ data: new Blob([new Uint8Array(10)]) });
    this.ondataavailable?.({ data: new Blob([]) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] };

function stubMedia(getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
}

const ROUTES = {
  "PUT /api/uploads/v1/": noContent(),
  "POST /api/v1/conversations/v1/finish": json({ status: "QUEUED" }, 202),
  "POST /api/v1/conversations": json({ id: "v1", status: "RECORDING" }, 201),
};

beforeEach(() => {
  router.push.mockReset();
  track.stop.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Object.defineProperty(navigator, "mediaDevices", {
    value: undefined,
    configurable: true,
  });
});

async function consent() {
  await userEvent.click(screen.getByLabelText(/동의를 받았어요/));
}

describe("녹음 (FR-001, FR-002)", () => {
  it("동의해야 시작할 수 있고, 녹음을 끝내면 조각을 올리고 진행 화면으로 간다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const calls = mockFetch(ROUTES);
    stubMedia(() => Promise.resolve(stream));
    render(<RecordScreen />);
    expect(screen.getByRole("button", { name: "녹음 시작" })).toBeDisabled();
    await consent();
    await userEvent.click(screen.getByRole("button", { name: "녹음 시작" }));
    expect(await screen.findByText("녹음 중")).toBeInTheDocument();
    expect(FakeRecorder.last.start).toHaveBeenCalledWith(60_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByText("00:03")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "녹음 끝내기" }));
    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/conversations/v1"),
    );
    expect(track.stop).toHaveBeenCalled();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /api/v1/conversations",
      "PUT /api/uploads/v1/0",
      "POST /api/v1/conversations/v1/finish",
    ]);
  });

  it("마이크를 쓸 수 없거나 녹음을 지원하지 않으면 알린다", async () => {
    stubMedia(() => Promise.reject(new Error("denied")));
    render(<RecordScreen />);
    await consent();
    await userEvent.click(screen.getByRole("button", { name: "녹음 시작" }));
    expect(
      await screen.findByText(/마이크를 쓸 수 없어요/),
    ).toBeInTheDocument();
    vi.stubGlobal("MediaRecorder", undefined);
    await userEvent.click(screen.getByRole("button", { name: "녹음 시작" }));
    expect(
      await screen.findByText(/이 브라우저에서는 녹음할 수 없어요/),
    ).toBeInTheDocument();
  });

  it("대화를 만들지 못하면 마이크를 끄고 알린다", async () => {
    mockFetch({
      "POST /api/v1/conversations": json(
        { error: { code: "X", message: "만들기 실패" } },
        500,
      ),
    });
    stubMedia(() => Promise.resolve(stream));
    render(<RecordScreen />);
    await consent();
    await userEvent.click(screen.getByRole("button", { name: "녹음 시작" }));
    expect(await screen.findByText("만들기 실패")).toBeInTheDocument();
    expect(track.stop).toHaveBeenCalled();
  });

  it("끝내기가 실패하면 다시 시작할 수 있게 한다", async () => {
    mockFetch({
      ...ROUTES,
      "POST /api/v1/conversations/v1/finish": json(
        { error: { code: "AUDIO_MISSING", message: "녹음이 비었어요." } },
        400,
      ),
    });
    stubMedia(() => Promise.resolve(stream));
    render(<RecordScreen />);
    await consent();
    await userEvent.click(screen.getByRole("button", { name: "녹음 시작" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "녹음 끝내기" }),
    );
    expect(await screen.findByText("녹음이 비었어요.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "녹음 시작" }),
    ).toBeInTheDocument();
  });
});

describe("녹음 파일 올리기 (FR-003)", () => {
  it("파일을 조각으로 올리고 진행 화면으로 간다", async () => {
    const calls = mockFetch(ROUTES);
    render(<RecordScreen />);
    await consent();
    const input = screen.getByLabelText("녹음 파일");
    await userEvent.upload(
      input,
      new File([new Uint8Array(1_000_000)], "talk.m4a", { type: "" }),
    );
    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/conversations/v1"),
    );
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(2);
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({
      source: "UPLOAD",
      consent: true,
      language: "ko",
    });
  });

  it("지원하지 않거나 너무 큰 파일은 거절한다", async () => {
    const calls = mockFetch(ROUTES);
    render(<RecordScreen />);
    await consent();
    const input = screen.getByLabelText("녹음 파일");
    await userEvent.upload(
      input,
      new File(["x"], "doc.pdf", { type: "application/pdf" }),
      {
        applyAccept: false,
      },
    );
    expect(await screen.findByText(/지원하지 않는 파일/)).toBeInTheDocument();
    const big = new File(["x"], "big.mp3", { type: "audio/mpeg" });
    Object.defineProperty(big, "size", { value: 60_000_000 });
    await userEvent.upload(input, big);
    expect(await screen.findByText(/파일이 너무 커요/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    await userEvent.click(
      screen.getByRole("button", { name: "녹음 파일 올리기" }),
    );
  });

  it("대화를 만들지 못하면 알린다", async () => {
    mockFetch({
      "POST /api/v1/conversations": json(
        { error: { code: "X", message: "업로드 실패" } },
        500,
      ),
    });
    render(<RecordScreen />);
    await consent();
    await userEvent.upload(
      screen.getByLabelText("녹음 파일"),
      new File(["x"], "a.wav", { type: "audio/wav" }),
    );
    expect(await screen.findByText("업로드 실패")).toBeInTheDocument();
  });
});
