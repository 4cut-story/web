import type {
  Ambient,
  Camera,
  Caption,
  LivePanel,
  LivePlayback,
  PanelSound,
} from "./types";

/** 라이브 모드 (docs specs/003-live-mode). 재생기 상태 계산은 여기 순수 함수로 두고 테스트한다. */

/** 컷이 넘어갈 때 그림이 겹쳐 바뀌는 시간. */
export const SLIDE_MS = 400;

/** 컷 그림 주소 (web 이미지 중계). frame 1·2(또는 true)면 움직임 컷의 두 번째·세 번째 그림. */
export function panelImageUrl(
  kind: "posts" | "comics",
  id: string,
  index: number,
  frame: boolean | number = 0,
): string {
  const n = frame === true ? 1 : Number(frame);
  const query = n === 1 ? "&frame=b" : n === 2 ? "&frame=c" : "";
  return `/api/images/${kind}/${id}?panel=${index}${query}`;
}

/**
 * 움직임 컷에서 step번째 바뀔 때 보여 줄 그림 번호(0부터). 두 장이면 0,1을, 세 장이면 0,1,2,1을 되풀이해 끊기지 않고
 * 오간다 (FR-044).
 */
export function frameAt(step: number, count: number): number {
  if (count < 2) {
    return 0;
  }
  const cycle = 2 * (count - 1);
  const k = ((step % cycle) + cycle) % cycle;
  return k < count ? k : cycle - k;
}

/** 배경음 주소 (web 중계). */
export function soundUrl(sound: PanelSound): string {
  return `/api/images/sounds/${sound.publicId}`;
}

/** 다음 컷. 마지막 컷이면 그대로(멈춘다). */
export function nextIndex(current: number, count: number): number {
  return Math.min(current + 1, Math.max(0, count - 1));
}

export function prevIndex(current: number): number {
  return Math.max(0, current - 1);
}

/** 컷이 바뀔 때 소리를 어떻게 할지: 같은 소리면 이어 틀고(keep), 다르면 바꾼다(switch). */
export function soundChange(
  from: PanelSound | null | undefined,
  to: PanelSound | null | undefined,
): "keep" | "switch" | "stop" | "none" {
  if (from && to) {
    return from.publicId === to.publicId ? "keep" : "switch";
  }
  if (from) {
    return "stop";
  }
  return to ? "switch" : "none";
}

/** 두 장 움직임을 켤지. 움직임 줄이기 설정이면 끈다. */
export function motionOn(
  panel: LivePanel | undefined,
  reduced: boolean,
): boolean {
  return Boolean(panel?.motion) && !reduced;
}

/** 저작자 표시가 필요한 소리(CC BY)인지. */
export function needsCredit(sound: PanelSound | null | undefined): boolean {
  return Boolean(sound?.credit?.license?.toUpperCase().startsWith("CC-BY"));
}

/** 스와이프 방향. 짧은 움직임은 무시한다. */
export function swipe(dx: number, threshold = 40): "next" | "prev" | null {
  if (Math.abs(dx) < threshold) {
    return null;
  }
  return dx < 0 ? "next" : "prev";
}

/** 넓은 그림(16:9) 컷이 하나라도 있으면 재생기를 16:9로 둔다. 1:1 컷은 그 안에 맞춰 넣는다. */
export function isWide(playback: LivePlayback | undefined): boolean {
  return Boolean(playback?.panels.some((p) => p.aspect === "16:9"));
}

/** 컷 시작부터 elapsedMs가 지났을 때 보여 줄 자막. 넓은 그림 컷만 자막을 쓴다(1:1은 말풍선이 있다). */
export function captionAt(
  panel: LivePanel | undefined,
  elapsedMs: number,
): Caption | null {
  if (panel?.aspect !== "16:9") {
    return null;
  }
  return (
    panel.captions?.find(
      (c) => elapsedMs >= c.startMs && elapsedMs < c.endMs,
    ) ?? null
  );
}

/** 카메라 움직임의 처음·끝 CSS transform. 움직임 줄이기 설정이면 움직이지 않는다. */
export function cameraTransform(
  camera: Camera | undefined,
  reduced: boolean,
): { from: string; to: string } {
  const still = { from: "none", to: "none" };
  if (reduced) {
    return still;
  }
  switch (camera) {
    case "push_in":
      return { from: "scale(1)", to: "scale(1.08)" };
    case "pull_out":
      return { from: "scale(1.08)", to: "scale(1)" };
    case "pan_left":
      return {
        from: "scale(1.08) translateX(3%)",
        to: "scale(1.08) translateX(-3%)",
      };
    case "pan_right":
      return {
        from: "scale(1.08) translateX(-3%)",
        to: "scale(1.08) translateX(3%)",
      };
    default:
      return still;
  }
}

/** 화면 효과 층 종류. 재생 정보의 다른 값은 무시한다. */
export const AMBIENTS: readonly Ambient[] = [
  "twinkle",
  "rain",
  "snow",
  "fireflies",
  "petals",
  "leaves",
  "steam",
  "dust",
  "flicker",
];

/** 컷에 얹을 화면 효과 층. 움직임 줄이기 설정이면 없고, 모르는 값·중복은 빼고 두 개까지. */
export function ambientOn(
  panel: LivePanel | undefined,
  reduced: boolean,
): Ambient[] {
  if (reduced || !panel?.ambient) {
    return [];
  }
  return [...new Set(panel.ambient)]
    .filter((a) => AMBIENTS.includes(a))
    .slice(0, 2);
}

/** 화면 효과 알갱이 하나. 위치는 그림 기준 %, 크기는 px, 시간은 ms. */
export type Particle = {
  x: number;
  y: number;
  width: number;
  height: number;
  delayMs: number;
  durationMs: number;
};

type Recipe = {
  count: number;
  /** 알갱이가 나타나는 세로 범위(%). 떨어지는 것은 애니메이션이 위에서 아래로 옮긴다. */
  y: [number, number];
  x: [number, number];
  width: [number, number];
  /** 없으면 width와 같다(둥근 알갱이). */
  height?: [number, number];
  durationMs: [number, number];
};

/** 종류별 알갱이 수·크기·속도. 화면 효과는 그림을 가리지 않게 작고 옅게 둔다. */
const RECIPES: Record<Ambient, Recipe> = {
  twinkle: {
    count: 18,
    y: [2, 55],
    x: [2, 98],
    width: [2, 4],
    durationMs: [1400, 3200],
  },
  rain: {
    count: 56,
    y: [0, 100],
    x: [-5, 100],
    width: [1, 1.5],
    height: [14, 26],
    durationMs: [550, 900],
  },
  snow: {
    count: 36,
    y: [0, 100],
    x: [0, 100],
    width: [3, 6],
    durationMs: [7000, 12000],
  },
  fireflies: {
    count: 12,
    y: [35, 92],
    x: [5, 95],
    width: [3, 5],
    durationMs: [4000, 7500],
  },
  petals: {
    count: 16,
    y: [0, 100],
    x: [0, 100],
    width: [7, 10],
    height: [5, 7],
    durationMs: [7000, 11000],
  },
  leaves: {
    count: 10,
    y: [0, 100],
    x: [0, 100],
    width: [9, 13],
    height: [6, 8],
    durationMs: [6000, 10000],
  },
  steam: {
    count: 5,
    y: [55, 72],
    x: [38, 62],
    width: [18, 30],
    durationMs: [3200, 4800],
  },
  dust: {
    count: 22,
    y: [5, 90],
    x: [5, 95],
    width: [1.5, 3],
    durationMs: [8000, 14000],
  },
  flicker: {
    count: 1,
    y: [0, 0],
    x: [0, 0],
    width: [0, 0],
    durationMs: [2600, 2600],
  },
};

/** 같은 종류는 늘 같은 자리에 둔다(화면이 다시 그려져도 알갱이가 튀지 않는다). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(r: () => number, [lo, hi]: [number, number]): number {
  return Math.round((lo + (hi - lo) * r()) * 10) / 10;
}

/** 종류별 알갱이 목록. 시작 지연은 음수라 재생하자마자 화면 곳곳에 알갱이가 있다. */
export function ambientParticles(type: Ambient): Particle[] {
  const recipe = RECIPES[type];
  const r = random(AMBIENTS.indexOf(type) * 7919 + 17);
  return Array.from({ length: recipe.count }, () => {
    const durationMs = Math.round(between(r, recipe.durationMs));
    const width = between(r, recipe.width);
    return {
      x: between(r, recipe.x),
      y: between(r, recipe.y),
      width,
      height: recipe.height ? between(r, recipe.height) : width,
      durationMs,
      delayMs: -Math.round(durationMs * r()),
    };
  });
}
