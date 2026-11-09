import { describe, expect, it } from "vitest";

import {
  ambientOn,
  ambientParticles,
  AMBIENTS,
  cameraTransform,
  captionAt,
  frameAt,
  isWide,
  motionOn,
  needsCredit,
  nextIndex,
  panelImageUrl,
  prevIndex,
  soundChange,
  soundUrl,
  swipe,
} from "./live";
import type { LivePanel, PanelSound } from "./types";

function sound(publicId: string, license?: string): PanelSound {
  return {
    publicId,
    title: "밤 풀벌레",
    volume: 0.8,
    fadeMs: 800,
    loop: true,
    credit: license ? { license, author: "kim" } : undefined,
  };
}

function panel(overrides: Partial<LivePanel> = {}): LivePanel {
  return {
    index: 1,
    role: "기",
    image: "panels/1.png",
    durationMs: 3500,
    sound: null,
    motion: null,
    ...overrides,
  };
}

describe("라이브 모드 계산", () => {
  it("컷 그림·소리 주소", () => {
    expect(panelImageUrl("posts", "p1", 2)).toBe(
      "/api/images/posts/p1?panel=2",
    );
    expect(panelImageUrl("comics", "c1", 3, true)).toBe(
      "/api/images/comics/c1?panel=3&frame=b",
    );
    expect(soundUrl(sound("s1"))).toBe("/api/images/sounds/s1");
  });

  it("FR-044: 세 번째 그림 주소, 그림 두세 장을 끊기지 않게 오가는 순서", () => {
    expect(panelImageUrl("posts", "p1", 1, 2)).toBe(
      "/api/images/posts/p1?panel=1&frame=c",
    );
    const order = (count: number) =>
      Array.from({ length: 8 }, (_, step) => frameAt(step, count));
    expect(order(2)).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
    expect(order(3)).toEqual([0, 1, 2, 1, 0, 1, 2, 1]);
    expect(frameAt(5, 1)).toBe(0);
  });

  it("다음·이전 컷, 마지막 컷에서 멈춘다", () => {
    expect(nextIndex(0, 4)).toBe(1);
    expect(nextIndex(3, 4)).toBe(3);
    expect(nextIndex(0, 0)).toBe(0);
    expect(prevIndex(2)).toBe(1);
    expect(prevIndex(0)).toBe(0);
  });

  it("같은 소리는 이어 틀고 다르면 바꾼다", () => {
    expect(soundChange(sound("a"), sound("a"))).toBe("keep");
    expect(soundChange(sound("a"), sound("b"))).toBe("switch");
    expect(soundChange(null, sound("b"))).toBe("switch");
    expect(soundChange(sound("a"), null)).toBe("stop");
    expect(soundChange(null, undefined)).toBe("none");
  });

  it("움직임 줄이기 설정이면 움직임을 끈다", () => {
    const moving = panel({
      motion: {
        type: "twinkle",
        frames: ["panels/1.png", "panels/1-b.png"],
        intervalMs: 700,
      },
    });
    expect(motionOn(moving, false)).toBe(true);
    expect(motionOn(moving, true)).toBe(false);
    expect(motionOn(panel(), false)).toBe(false);
    expect(motionOn(undefined, false)).toBe(false);
  });

  it("CC BY 소리만 저작자를 밝힌다", () => {
    expect(needsCredit(sound("a", "CC-BY-4.0"))).toBe(true);
    expect(needsCredit(sound("a", "cc-by-3.0"))).toBe(true);
    expect(needsCredit(sound("a", "CC0-1.0"))).toBe(false);
    expect(needsCredit(sound("a"))).toBe(false);
    expect(needsCredit(null)).toBe(false);
  });

  it("짧은 움직임은 스와이프가 아니다", () => {
    expect(swipe(-60)).toBe("next");
    expect(swipe(60)).toBe("prev");
    expect(swipe(10)).toBeNull();
  });
});

describe("라이브 전용 넓은 그림 (FR-031·035)", () => {
  it("넓은 그림 컷이 하나라도 있으면 16:9 재생기다", () => {
    expect(
      isWide({ version: 1, panels: [panel(), panel({ aspect: "16:9" })] }),
    ).toBe(true);
    expect(isWide({ version: 1, panels: [panel()] })).toBe(false);
    expect(isWide(undefined)).toBe(false);
  });

  it("자막은 넓은 그림 컷에서 시간에 맞는 것만 보여 준다", () => {
    const captions = [
      { speaker: "민지", text: "하나", startMs: 300, endMs: 1000 },
      { text: "둘", startMs: 1150, endMs: 3500 },
    ];
    const wide = panel({ aspect: "16:9", captions });
    expect(captionAt(wide, 100)).toBeNull();
    expect(captionAt(wide, 500)?.text).toBe("하나");
    expect(captionAt(wide, 1100)).toBeNull();
    expect(captionAt(wide, 2000)?.text).toBe("둘");
    expect(captionAt(panel({ captions }), 500)).toBeNull();
    expect(captionAt(undefined, 500)).toBeNull();
  });

  it("카메라는 방향마다 처음·끝이 다르고, 움직임 줄이기면 움직이지 않는다", () => {
    expect(cameraTransform("push_in", false)).toEqual({
      from: "scale(1)",
      to: "scale(1.08)",
    });
    expect(cameraTransform("pull_out", false).from).toBe("scale(1.08)");
    expect(cameraTransform("pan_left", false).to).toContain("translateX(-3%)");
    expect(cameraTransform("pan_right", false).to).toContain("translateX(3%)");
    expect(cameraTransform("none", false)).toEqual({
      from: "none",
      to: "none",
    });
    expect(cameraTransform(undefined, false).to).toBe("none");
    expect(cameraTransform("push_in", true)).toEqual({
      from: "none",
      to: "none",
    });
  });
});

describe("화면 효과 층", () => {
  const panel = (ambient: unknown): LivePanel =>
    ({
      index: 1,
      role: "기",
      image: "panels/1.png",
      durationMs: 3500,
      sound: null,
      motion: null,
      ambient,
    }) as LivePanel;

  it("FR-042: 모르는 값·중복은 빼고 두 개까지, 움직임 줄이기 설정이면 없다", () => {
    expect(
      ambientOn(
        panel(["flicker", "flicker", "glitter", "twinkle", "snow"]),
        false,
      ),
    ).toEqual(["flicker", "twinkle"]);
    expect(ambientOn(panel(["rain"]), true)).toEqual([]);
    expect(ambientOn(panel(undefined), false)).toEqual([]);
  });

  it("FR-043: 종류마다 알갱이가 늘 같은 자리에 있고, 재생하자마자 화면 곳곳에 있다", () => {
    for (const type of AMBIENTS) {
      const first = ambientParticles(type);
      expect(first.length).toBeGreaterThan(0);
      expect(ambientParticles(type)).toEqual(first);
      for (const p of first) {
        expect(p.delayMs).toBeLessThanOrEqual(0);
        expect(p.delayMs).toBeGreaterThanOrEqual(-p.durationMs);
      }
    }
    expect(ambientParticles("rain").length).toBeGreaterThan(
      ambientParticles("fireflies").length,
    );
  });
});
