import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LivePlayer } from "./live-player";
import { ViewModeToggle } from "./view-mode";
import { json, mockFetch } from "@/test/fetch-mock";
import type { AudioFactory } from "@/lib/live-audio";

const sound = (publicId: string, license = "CC0-1.0") => ({
  publicId,
  title: `소리 ${publicId}`,
  volume: 0.8,
  fadeMs: 800,
  loop: true,
  credit: {
    author: "kim",
    license,
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://freesound.org/s/1/",
    originalTitle: "night crickets",
  },
});

const PLAYBACK = {
  version: 1,
  panels: [
    {
      index: 1,
      role: "기",
      image: "panels/1.png",
      durationMs: 3500,
      sound: sound("a"),
      motion: {
        type: "twinkle",
        frames: ["panels/1.png", "panels/1-b.png"],
        intervalMs: 700,
      },
    },
    {
      index: 2,
      role: "승",
      image: "panels/2.png",
      durationMs: 4000,
      sound: sound("a"),
      motion: null,
      effect: { ...sound("e", "CC-BY-4.0"), loop: false, fadeMs: 0 },
    },
    {
      index: 3,
      role: "전",
      image: "panels/3.png",
      durationMs: 3500,
      sound: sound("b", "CC-BY-4.0"),
      motion: null,
    },
  ],
};

function fakeAudio() {
  const played: string[] = [];
  const factory: AudioFactory = {
    context: () => null,
    audio: (src) =>
      ({
        src,
        play: () => {
          played.push(src);
          return Promise.resolve();
        },
        pause: vi.fn(),
      }) as unknown as HTMLAudioElement,
  };
  return { factory, played };
}

function media(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduce })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function open(reduce = false) {
  media(reduce);
  const calls = mockFetch({ "GET /api/v1/posts/p1/live": json(PLAYBACK) });
  const audio = fakeAudio();
  render(
    <LivePlayer
      kind="posts"
      id="p1"
      title="밤하늘"
      audioFactory={audio.factory}
    />,
  );
  await screen.findByAltText("밤하늘 1컷");
  return { calls, played: audio.played };
}

describe("라이브 모드 재생기", () => {
  it("재생을 누르기 전에는 소리를 내지 않는다", async () => {
    const { calls, played } = await open();
    expect(calls[0].url).toBe("/api/v1/posts/p1/live");
    expect(screen.getByAltText("밤하늘 1컷")).toHaveAttribute(
      "src",
      "/api/images/posts/p1?panel=1",
    );
    expect(played).toEqual([]);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("재생하면 컷을 넘기고, 같은 소리는 이어 틀고, 마지막 컷에서 멈춘다", async () => {
    const { played } = await open();
    vi.useFakeTimers();
    fireEvent.click(screen.getAllByRole("button", { name: "재생" })[0]);
    expect(played).toEqual(["/api/images/sounds/a"]);
    // 움직이는 컷은 두 번째 그림을 번갈아 보여 준다
    const second = screen.getByTestId("frame-b-1");
    expect(second).toHaveAttribute(
      "src",
      "/api/images/posts/p1?panel=1&frame=b",
    );
    act(() => vi.advanceTimersByTime(700));
    expect(second.style.opacity).toBe("1");
    act(() => vi.advanceTimersByTime(2800));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    // 같은 배경음은 이어 틀고, 사건 효과음만 한 번 더 튼다
    expect(played).toEqual(["/api/images/sounds/a", "/api/images/sounds/e"]);
    expect(screen.getByText(/효과음: 소리 e/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(played).toEqual([
      "/api/images/sounds/a",
      "/api/images/sounds/e",
      "/api/images/sounds/b",
    ]);
    // CC BY 소리는 저작자를 밝힌다
    expect(screen.getByRole("link", { name: "CC-BY-4.0" })).toBeInTheDocument();
    expect(screen.getByText(/kim/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3500));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 재생" }),
    ).toBeInTheDocument();
  });

  it("움직임 줄이기 설정이면 두 번째 그림을 보이지 않는다", async () => {
    await open(true);
    vi.useFakeTimers();
    fireEvent.click(screen.getAllByRole("button", { name: "재생" })[0]);
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByTestId("frame-b-1").style.opacity).toBe("0");
  });

  it("버튼·방향키·스와이프로 컷을 옮긴다", async () => {
    await open();
    expect(screen.getByRole("button", { name: "이전 컷" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "다음 컷" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    const stage = screen.getByAltText("밤하늘 1컷").closest("[tabindex]")!;
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 컷" })).toBeDisabled();
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(stage, { key: "Enter" });
    fireEvent.pointerDown(stage, { clientX: 100 });
    fireEvent.pointerUp(stage, { clientX: 200 });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.pointerDown(stage, { clientX: 200 });
    fireEvent.pointerUp(stage, { clientX: 100 });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.pointerUp(stage, { clientX: 100 });
    fireEvent.pointerDown(stage, { clientX: 100 });
    fireEvent.pointerUp(stage, { clientX: 110 });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("일시 정지·음소거·소리 크기", async () => {
    await open();
    fireEvent.click(screen.getAllByRole("button", { name: "재생" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "일시 정지" }));
    expect(
      screen.getByRole("button", { name: "다시 재생" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "소리 끄기" }));
    expect(screen.getByRole("button", { name: "소리 켜기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByLabelText("소리 크기"), {
      target: { value: "0.3" },
    });
    expect(screen.getByLabelText("소리 크기")).toHaveValue("0.3");
  });

  it("재생 정보를 받지 못하면 알린다", async () => {
    media(false);
    mockFetch({});
    render(<LivePlayer kind="comics" id="c1" />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("보기 모드 버튼", () => {
  it("고른 모드를 표시하고 바꾼다", () => {
    const onChange = vi.fn();
    render(<ViewModeToggle mode="comic" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "만화보기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "라이브" }));
    expect(onChange).toHaveBeenCalledWith("live");
  });
});
