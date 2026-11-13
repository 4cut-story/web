import { describe, expect, it } from "vitest";

import {
  ambientBehind,
  ambientOn,
  ambientParticles,
  breathPhase,
  characterMotionOn,
  followLevel,
  MAX_PEOPLE,
  nearWeight,
  peopleOf,
  speakerIndex,
  depthMaskAlpha,
  AMBIENTS,
  cameraTransform,
  captionAt,
  depthImageUrl,
  frameAt,
  isWide,
  motionOn,
  needsCredit,
  nextIndex,
  panelImageUrl,
  framesNeeded,
  panelSizes,
  panelSrcSet,
  parallaxAt,
  parallaxOn,
  PARALLAX_SHIFT,
  PARALLAX_ZOOM,
  prevIndex,
  soundChange,
  soundUrl,
  swipe,
  voicesOf,
  voiceUrl,
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
    // FR-049: 넓은 그림 컷 네 장은 끝까지 갔다가 되돌아온다
    expect(order(4)).toEqual([0, 1, 2, 3, 2, 1, 0, 1]);
    expect(panelImageUrl("posts", "p1", 1, 3)).toBe(
      "/api/images/posts/p1?panel=1&frame=d",
    );
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

  it("FR-043: 같은 컷이면 알갱이가 늘 같은 자리에 있고, 재생하자마자 화면 곳곳에 있다", () => {
    for (const type of AMBIENTS) {
      const first = ambientParticles(type);
      expect(first.length).toBeGreaterThan(0);
      expect(ambientParticles(type)).toEqual(first);
      for (const p of first) {
        expect(p.delayMs).toBeLessThanOrEqual(0);
        expect(p.delayMs).toBeGreaterThanOrEqual(-p.durationMs);
      }
    }
    // 별똥별은 하늘 위쪽에서 시작하는 긴 빛줄기다
    for (const p of ambientParticles("meteor")) {
      expect(p.y).toBeLessThanOrEqual(30);
      expect(p.width).toBeGreaterThan(p.height * 20);
    }
    expect(AMBIENTS).toEqual(
      expect.arrayContaining([
        "meteor",
        "fireworks",
        "lightning",
        "glow",
        "sunbeam",
        "screen",
        "bokeh",
        "clouds",
        "bubbles",
      ]),
    );
    // 도시 불빛은 여러 색이 섞이고, 방울은 거리 층으로 나뉜다
    expect(
      new Set(ambientParticles("bokeh", "c:1").map((p) => p.tint)).size,
    ).toBeGreaterThan(1);
    expect(
      new Set(ambientParticles("bubbles", "c:1").map((p) => p.layer)).size,
    ).toBeGreaterThan(1);
    expect(ambientParticles("rain").length).toBeGreaterThan(
      ambientParticles("fireflies").length,
    );
  });

  it("FR-043: 만화·컷마다 알갱이 자리와 바람이 달라 같은 무늬가 되풀이되지 않는다", () => {
    const a = ambientParticles("rain", "comic-1:1");
    expect(ambientParticles("rain", "comic-1:1")).toEqual(a);
    const b = ambientParticles("rain", "comic-1:2");
    expect(b.map((p) => p.x)).not.toEqual(a.map((p) => p.x));
    // 한 컷의 비는 한쪽으로 기울고, 컷이 바뀌면 기울기도 달라질 수 있다
    const tilts = new Set(
      ["a", "b", "c", "d", "e", "f"].map((s) =>
        Math.sign(ambientParticles("rain", s).reduce((n, p) => n + p.sway, 0)),
      ),
    );
    expect(tilts.size).toBeGreaterThan(1);
  });

  it("FR-043: 떨어지는 것은 먼 층·중간 층·가까운 층으로 나뉘어 크기·속도·진하기가 다르다", () => {
    const leaves = ambientParticles("leaves", "x:3");
    const far = leaves.filter((p) => p.layer === 0);
    const near = leaves.filter((p) => p.layer === 2);
    expect(far.length).toBeGreaterThan(0);
    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(near.length);
    const avg = (ps: typeof leaves, f: (p: (typeof leaves)[0]) => number) =>
      ps.reduce((n, p) => n + f(p), 0) / ps.length;
    expect(avg(near, (p) => p.width)).toBeGreaterThan(avg(far, (p) => p.width));
    expect(avg(near, (p) => p.durationMs)).toBeLessThan(
      avg(far, (p) => p.durationMs),
    );
    expect(avg(near, (p) => p.opacity)).toBeGreaterThan(
      avg(far, (p) => p.opacity),
    );
    expect(near.every((p) => p.blur > 0)).toBe(true);
    // 낙엽은 여러 색, 회전 방향도 섞인다
    expect(new Set(leaves.map((p) => p.tint)).size).toBeGreaterThan(1);
    expect(new Set(leaves.map((p) => Math.sign(p.spin))).size).toBe(2);
    // 별빛처럼 층을 나누지 않는 것은 모두 중간 층이다
    expect(ambientParticles("twinkle", "x").every((p) => p.layer === 1)).toBe(
      true,
    );
  });

  it("FR-043: 그림 속 공기·하늘에 있는 것만 인물 뒤로 보낸다", () => {
    expect(ambientBehind("rain")).toBe(true);
    expect(ambientBehind("leaves")).toBe(true);
    expect(ambientBehind("twinkle")).toBe(true);
    expect(ambientBehind("lightning")).toBe(false);
    expect(ambientBehind("flicker")).toBe(false);
    expect(ambientBehind("glow")).toBe(false);
    expect(ambientBehind("steam")).toBe(false);
    // 멀리 있는 도시 불빛·구름·방울은 인물 뒤로, 창빛·화면 빛은 그림 전체에 얹는다
    expect(ambientBehind("bokeh")).toBe(true);
    expect(ambientBehind("clouds")).toBe(true);
    expect(ambientBehind("bubbles")).toBe(true);
    expect(ambientBehind("sunbeam")).toBe(false);
    expect(ambientBehind("screen")).toBe(false);
  });

  it("FR-043: 깊이 지도에서 가장 가까운 곳은 가리고 먼 곳은 그대로 보인다", () => {
    const luma = Array.from({ length: 100 }, (_, i) => i * 2);
    const alpha = depthMaskAlpha(luma);
    expect(alpha[0]).toBe(255);
    expect(alpha[40]).toBe(255);
    expect(alpha[99]).toBe(0);
    expect(alpha[80]).toBe(0);
    // 그 사이는 부드럽게 옅어진다
    expect(alpha[65]).toBeGreaterThan(0);
    expect(alpha[65]).toBeLessThan(255);
    // 깊이 값이 모두 같아도 0으로 나누지 않는다
    expect(Array.from(depthMaskAlpha([7, 7, 7]))).toHaveLength(3);
  });
});

describe("깊이 패럴랙스 (FR-048)", () => {
  it("깊이 지도가 있는 넓은 그림 컷만 켜고, 움직임 줄이기 설정이면 끈다", () => {
    const wide = panel({ aspect: "16:9", depth: "panels/1-depth.png" });
    expect(parallaxOn(wide, false, true)).toBe(true);
    expect(parallaxOn(wide, false)).toBe(false);
    expect(parallaxOn(wide, true, true)).toBe(false);
    expect(parallaxOn(panel({ aspect: "16:9" }), false)).toBe(false);
    expect(parallaxOn(panel({ depth: "panels/1-depth.png" }), false)).toBe(
      false,
    );
    expect(parallaxOn(undefined, false)).toBe(false);
    expect(depthImageUrl("posts", "p1", 2)).toBe(
      "/api/images/posts/p1?panel=2&frame=depth",
    );
  });

  it("옆으로 훑으면 가까운 것이 같은 쪽으로 더 움직이고, 당기면 가까운 것이 더 커진다", () => {
    expect(parallaxAt("pan_right", 0, 0).x).toBeCloseTo(-PARALLAX_SHIFT);
    expect(parallaxAt("pan_right", 1, 0).x).toBeCloseTo(PARALLAX_SHIFT);
    expect(parallaxAt("pan_left", 0, 0).x).toBeCloseTo(PARALLAX_SHIFT);
    expect(parallaxAt("push_in", 1, 0).zoom).toBeCloseTo(PARALLAX_ZOOM);
    expect(parallaxAt("pull_out", 1, 0).zoom).toBeCloseTo(0);
    expect(parallaxAt("push_in", 5, 0).zoom).toBeCloseTo(PARALLAX_ZOOM);
    // 가만히 있는 카메라도 천천히 흔들린다
    const a = parallaxAt("none", 0, 0);
    const b = parallaxAt("none", 0, 1500);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0);
    expect(Math.abs(b.x)).toBeLessThanOrEqual(PARALLAX_SHIFT);
  });
});

describe("대사 음성 (FR-050)", () => {
  it("자막 음성 경로를 컷·순번 주소로 바꾸고, 규칙에 맞지 않으면 버린다", () => {
    expect(
      voiceUrl("posts", "p1", { path: "voice/2-3.mp3", durationMs: 900 }),
    ).toBe("/api/images/posts/p1?panel=2&voice=3");
    expect(voiceUrl("comics", "c", { path: "../x.mp3", durationMs: 1 })).toBe(
      null,
    );
    expect(voiceUrl("comics", "c", null)).toBe(null);
  });

  it("자막의 음성을 자막 시작 시각에 튼다. 1:1 컷도 음성은 튼다", () => {
    const panel = {
      index: 1,
      role: "기",
      image: "panels/1.png",
      durationMs: 6000,
      sound: null,
      motion: null,
      aspect: "16:9",
      captions: [
        {
          text: "a",
          startMs: 300,
          endMs: 1500,
          voice: { path: "voice/1-1.mp3", durationMs: 1000 },
        },
        { text: "b", startMs: 1750, endMs: 3000, voice: null },
        { text: "c", startMs: 3250, endMs: 4000 },
      ],
    } as LivePanel;
    expect(voicesOf("posts", "p1", panel)).toEqual([
      { atMs: 300, url: "/api/images/posts/p1?panel=1&voice=1" },
    ]);
    expect(voicesOf("posts", "p1", { ...panel, aspect: "1:1" })).toEqual([
      { atMs: 300, url: "/api/images/posts/p1?panel=1&voice=1" },
    ]);
    expect(captionAt({ ...panel, aspect: "1:1" }, 400)).toBe(null);
    expect(voicesOf("posts", "p1", undefined)).toEqual([]);
  });
});

describe("컷 그림 크기와 미리 받기", () => {
  it("srcSet은 정해 둔 폭마다 w를 붙이고, sizes는 전체 화면이면 화면 폭이다", () => {
    expect(panelSrcSet("/api/images/posts/p1?panel=1")).toBe(
      "/api/images/posts/p1?panel=1&w=384 384w, /api/images/posts/p1?panel=1&w=640 640w, /api/images/posts/p1?panel=1&w=1024 1024w",
    );
    expect(panelSizes(true)).toBe("100vw");
    expect(panelSizes(false)).toContain("46rem");
  });

  it("움직임 그림은 지금 컷과 다음 컷만 붙인다", () => {
    expect(framesNeeded(2, 2)).toBe(true);
    expect(framesNeeded(3, 2)).toBe(true);
    expect(framesNeeded(1, 2)).toBe(false);
    expect(framesNeeded(4, 2)).toBe(false);
  });
});

describe("라이브 모드 인물 움직임 (FR-052)", () => {
  const wide = (o: Partial<LivePanel> = {}) => panel({ aspect: "16:9", ...o });

  it("넓은 그림 컷에 인물 자리나 깊이 지도가 있을 때만 움직인다", () => {
    const person = { speaker: "엄마", x: 0.4, y: 0.3, size: 0.2 };
    expect(characterMotionOn(wide({ people: [person] }), false)).toBe(true);
    expect(
      characterMotionOn(wide({ depth: "panels/1-depth.png" }), false),
    ).toBe(true);
    expect(characterMotionOn(wide(), false)).toBe(false);
    expect(characterMotionOn(wide({ people: [person] }), true)).toBe(false);
    expect(
      characterMotionOn(panel({ people: [person], aspect: "1:1" }), false),
    ).toBe(false);
    expect(characterMotionOn(undefined, false)).toBe(false);
  });

  it("그림 밖이거나 크기가 이상한 인물 자리는 빼고, 많아야 네 명까지 쓴다", () => {
    const ok = (k: number) => ({
      speaker: `p${k}`,
      x: 0.1 * k,
      y: 0.3,
      size: 0.2,
    });
    const people = peopleOf(
      wide({
        people: [
          { speaker: "밖", x: 1.2, y: 0.3, size: 0.2 },
          { speaker: "작음", x: 0.5, y: 0.3, size: 0.01 },
          { speaker: "큼", x: 0.5, y: 0.3, size: 0.9 },
          ok(1),
          ok(2),
          ok(3),
          ok(4),
          ok(5),
        ],
      }),
    );
    expect(people.map((p) => p.speaker)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(people).toHaveLength(MAX_PEOPLE);
    expect(peopleOf(undefined)).toEqual([]);
  });

  it("자막 화자와 같은 호칭의 인물이 말하는 인물이다", () => {
    const people = [
      { speaker: "엄마", x: 0.3, y: 0.3, size: 0.2 },
      { speaker: "아들", x: 0.7, y: 0.3, size: 0.2 },
    ];
    expect(speakerIndex(people, "아들")).toBe(1);
    expect(speakerIndex(people, "할머니")).toBe(-1);
    expect(speakerIndex(people, null)).toBe(-1);
  });

  it("인물마다 숨 위상과 빠르기가 다르고, 같은 컷이면 늘 같다", () => {
    const a = breathPhase("c1:1", 0);
    const b = breathPhase("c1:1", 1);
    expect(a).toEqual(breathPhase("c1:1", 0));
    expect(a.phase).not.toBeCloseTo(b.phase);
    for (const p of [a, b]) {
      expect(p.phase).toBeGreaterThanOrEqual(0);
      expect(p.phase).toBeLessThan(2 * Math.PI);
      expect(p.rate).toBeGreaterThanOrEqual(0.85);
      expect(p.rate).toBeLessThanOrEqual(1.15);
    }
  });

  it("소리가 커질 때는 빨리, 작아질 때는 천천히 따라간다", () => {
    const up = followLevel(0, 1, 60);
    const down = 1 - followLevel(1, 0, 60);
    expect(up).toBeGreaterThan(down);
    expect(followLevel(0.5, 2, 10_000)).toBeCloseTo(1);
    expect(followLevel(0.5, 0.5, 16)).toBeCloseTo(0.5);
    expect(followLevel(0.3, 0.8, -5)).toBeCloseTo(0.3);
  });

  it("깊이 지도의 가까운 곳은 무게가 크고 먼 곳은 0이며, 경계는 부드럽다", () => {
    const width = 24;
    const height = 12;
    const luma = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        luma[y * width + x] = x >= 9 && x < 15 ? 230 : 40;
      }
    }
    const w = nearWeight(luma, width, height);
    const at = (x: number) => w[6 * width + x];
    expect(at(12)).toBeGreaterThan(150);
    expect(at(0)).toBe(0);
    expect(at(8)).toBeGreaterThan(0);
    expect(at(8)).toBeLessThan(at(12));
  });
});
