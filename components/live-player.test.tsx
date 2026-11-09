import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Activity } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LivePlayer } from "./live-player";
import { ViewModeToggle } from "./view-mode";
import { json, mockFetch } from "@/test/fetch-mock";
import type { AudioFactory } from "@/lib/live-audio";
import type { LivePanel } from "@/lib/types";

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

/** 첫 컷만 바꾼 재생 정보로 재생기를 띄운다. */
async function renderFirst(reduce: boolean, first: Partial<LivePanel>) {
  media(reduce);
  mockFetch({
    "GET /api/v1/posts/p1/live": json({
      version: 1,
      panels: [{ ...PLAYBACK.panels[0], ...first }, PLAYBACK.panels[1]],
    }),
  });
  const view = render(
    <LivePlayer
      kind="posts"
      id="p1"
      title="밤하늘"
      audioFactory={fakeAudio().factory}
    />,
  );
  await screen.findByAltText("밤하늘 1컷");
  return view;
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

  it("화면을 떠났다 돌아오면 누르기 전까지 다시 재생하지 않는다", async () => {
    media(false);
    mockFetch({ "GET /api/v1/posts/p1/live": json(PLAYBACK) });
    const audio = fakeAudio();
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <LivePlayer
          kind="posts"
          id="p1"
          title="밤하늘"
          audioFactory={audio.factory}
        />
      </Activity>
    );
    const { rerender } = render(view("visible"));
    await screen.findByAltText("밤하늘 1컷");
    fireEvent.click(screen.getAllByRole("button", { name: "재생" })[0]);
    expect(audio.played).toEqual(["/api/images/sounds/a"]);
    rerender(view("hidden"));
    rerender(view("visible"));
    expect(audio.played).toEqual(["/api/images/sounds/a"]);
    expect(
      screen.getAllByRole("button", { name: "재생" })[0],
    ).toBeInTheDocument();
  });

  it("FR-031·035: 넓은 그림 컷은 16:9로 보여 주고 대사를 시간에 맞춰 자막으로 바꾸며 카메라가 움직인다", async () => {
    media(false);
    mockFetch({
      "GET /api/v1/posts/p1/live": json({
        version: 1,
        panels: [
          {
            ...PLAYBACK.panels[0],
            motion: null,
            aspect: "16:9",
            camera: "push_in",
            captions: [
              { speaker: "민지", text: "별이 많다", startMs: 300, endMs: 1500 },
              { speaker: null, text: "그러게", startMs: 1650, endMs: 3500 },
            ],
          },
          { ...PLAYBACK.panels[2], aspect: "1:1", camera: "pan_left" },
        ],
      }),
    });
    const audio = fakeAudio();
    render(
      <LivePlayer
        kind="posts"
        id="p1"
        title="밤하늘"
        audioFactory={audio.factory}
      />,
    );
    const image = await screen.findByAltText("밤하늘 1컷");
    expect(image).toHaveAttribute("width", "1024");
    expect(image.parentElement?.parentElement?.className).toContain(
      "aspect-video",
    );
    // 재생 전에는 첫 자막을 보여 준다
    expect(screen.getByText("별이 많다")).toBeInTheDocument();
    expect(screen.getByText("민지")).toBeInTheDocument();
    vi.useFakeTimers();
    fireEvent.click(screen.getAllByRole("button", { name: "재생" })[0]);
    expect(screen.getByTestId("panel-1").style.transform).toBe("scale(1.08)");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("별이 많다")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(800));
    expect(screen.queryByText("별이 많다")).not.toBeInTheDocument();
    expect(screen.getByText("그러게")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1800));
    // 1:1 컷(말풍선이 있는 컷 그림)은 자막이 없다
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.queryByText("그러게")).not.toBeInTheDocument();
  });

  it("FR-042: 지금 컷에 화면 효과 층을 얹고, 멈추면 움직임도 멈추며, 움직임 줄이기 설정이면 없다", async () => {
    for (const reduce of [false, true]) {
      const view = await renderFirst(reduce, {
        ambient: ["twinkle", "fireflies"],
      });
      if (reduce) {
        expect(screen.queryByTestId("ambient")).not.toBeInTheDocument();
      } else {
        const layer = screen.getByTestId("ambient");
        expect(layer.querySelector('[data-ambient="twinkle"]')).not.toBeNull();
        expect(
          layer.querySelector('[data-ambient="fireflies"]'),
        ).not.toBeNull();
        const dot = layer.querySelector<HTMLElement>(".ambient")!;
        expect(dot.style.animationPlayState).toBe("paused");
        fireEvent.click(screen.getAllByRole("button", { name: "재생" })[0]);
        expect(
          screen.getByTestId("ambient").querySelector<HTMLElement>(".ambient")!
            .style.animationPlayState,
        ).toBe("running");
      }
      view.unmount();
    }
  });

  it("FR-048: 깊이 지도가 있는 넓은 그림 컷은 패럴랙스 층을 얹고, 움직임 줄이기 설정이면 없다", async () => {
    for (const reduce of [false, true]) {
      const view = await renderFirst(reduce, {
        aspect: "16:9",
        depth: "panels/1-depth.png",
      });
      if (reduce) {
        expect(screen.queryByTestId("depth-parallax")).not.toBeInTheDocument();
      } else {
        // WebGL이 없는 곳에서는 그리지 않아 평면 그림이 보인다
        const layer = screen.getByTestId("depth-parallax");
        expect(layer.style.opacity).toBe("0");
      }
      view.unmount();
    }
  });

  it("FR-044: 그림이 세 장인 움직임 컷은 a→b→c→b 순서로 오간다", async () => {
    media(false);
    mockFetch({
      "GET /api/v1/posts/p1/live": json({
        version: 1,
        panels: [
          {
            ...PLAYBACK.panels[0],
            durationMs: 8000,
            motion: {
              type: "rain",
              frames: ["panels/1.png", "panels/1-b.png", "panels/1-c.png"],
              intervalMs: 300,
            },
          },
        ],
      }),
    });
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
    const b = screen.getByTestId("frame-b-1");
    const c = screen.getByTestId("frame-c-1");
    expect(c).toHaveAttribute("src", "/api/images/posts/p1?panel=1&frame=c");
    vi.useFakeTimers();
    fireEvent.click(screen.getAllByRole("button", { name: "재생" })[0]);
    const seen: string[] = [];
    for (let k = 0; k < 4; k++) {
      act(() => vi.advanceTimersByTime(300));
      seen.push(
        c.style.opacity === "1" ? "c" : b.style.opacity === "1" ? "b" : "a",
      );
    }
    expect(seen).toEqual(["b", "c", "b", "a"]);
  });

  it("전체 화면을 지원하면 버튼으로 재생 화면을 전체 화면으로 키우고, 아니면 버튼이 없다", async () => {
    await open();
    expect(
      screen.queryByRole("button", { name: "전체 화면" }),
    ).not.toBeInTheDocument();
    cleanup();

    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: true,
    });
    const request = vi.fn(() => Promise.resolve());
    HTMLElement.prototype.requestFullscreen = request;
    try {
      await open();
      fireEvent.click(screen.getByRole("button", { name: "전체 화면" }));
      expect(request).toHaveBeenCalledTimes(1);
      const stage = screen.getByTestId("panel-1").parentElement!;
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        value: stage,
      });
      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });
      expect(
        screen.getByRole("button", { name: "전체 화면 끝내기" }),
      ).toBeInTheDocument();
      // 전체 화면에서는 넓은 그림도 잘리지 않게 다 보여 준다
      expect(screen.getByAltText("밤하늘 1컷").className).toContain(
        "object-contain",
      );
    } finally {
      Object.defineProperty(document, "fullscreenEnabled", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        value: null,
      });
    }
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
