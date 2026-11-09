import { describe, expect, it } from "vitest";

import {
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
