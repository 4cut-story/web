import type {
  Ambient,
  Camera,
  Caption,
  CaptionVoice,
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
  const query = n >= 1 && n <= 3 ? `&frame=${"bcd"[n - 1]}` : "";
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

/** 넓은 그림 컷의 깊이 지도 주소 (web 이미지 중계, FR-048). */
export function depthImageUrl(
  kind: "posts" | "comics",
  id: string,
  index: number,
): string {
  return `/api/images/${kind}/${id}?panel=${index}&frame=depth`;
}

/**
 * 깊이 패럴랙스를 쓸지. 한 장의 깊이 지도로 픽셀을 밀면 인물 경계가 늘어나 목이 뒤로 빠지는 것처럼 보여 꺼 둔다. 깊이 지도는
 * 계속 만들어 두므로 층을 나눠 그리는 방식이 생기면 다시 켠다.
 */
export const PARALLAX_ENABLED = false;

export function parallaxOn(
  panel: LivePanel | undefined,
  reduced: boolean,
  enabled: boolean = PARALLAX_ENABLED,
): boolean {
  return (
    enabled &&
    !reduced &&
    panel?.aspect === "16:9" &&
    typeof panel.depth === "string" &&
    panel.depth.length > 0
  );
}

/** 깊이 패럴랙스의 한 순간. x·y는 가까운 것이 먼 것보다 더 움직이는 거리(그림 폭 비율), zoom은 가까운 것이 더 커지는 정도. */
export type Parallax = { x: number; y: number; zoom: number };

/** 패럴랙스 세기. 가까운 것이 그림 폭의 4% 남짓 움직여 눈에 띄고, 가장자리는 확대(1.12배)로 덮는다. */
export const PARALLAX_SHIFT = 0.08;
export const PARALLAX_ZOOM = 0.12;

/**
 * 컷이 시작되고 progress(0~1)만큼 지났을 때의 깊이 움직임. 카메라 방향과 같은 쪽으로 가까운 것이 더 크게 움직여 공간 안으로
 * 들어가는 것처럼 보인다. 가만히 있는 카메라도 천천히 원을 그리며 흔들린다.
 */
export function parallaxAt(
  camera: Camera | undefined,
  progress: number,
  elapsedMs: number,
): Parallax {
  const t = Math.min(1, Math.max(0, progress));
  const sway = (elapsedMs / 6000) * 2 * Math.PI;
  const swayX = Math.sin(sway) * PARALLAX_SHIFT * 0.35;
  const swayY = Math.cos(sway) * PARALLAX_SHIFT * 0.2;
  switch (camera) {
    case "pan_right":
      return { x: PARALLAX_SHIFT * (2 * t - 1), y: swayY, zoom: 0 };
    case "pan_left":
      return { x: PARALLAX_SHIFT * (1 - 2 * t), y: swayY, zoom: 0 };
    case "push_in":
      return { x: swayX, y: swayY, zoom: PARALLAX_ZOOM * t };
    case "pull_out":
      return { x: swayX, y: swayY, zoom: PARALLAX_ZOOM * (1 - t) };
    default:
      return { x: swayX * 2, y: swayY * 2, zoom: 0 };
  }
}

/** 자막 대사 음성 주소 (web 중계). 경로가 voice/{컷}-{순번}.mp3가 아니면 null. */
export function voiceUrl(
  kind: "posts" | "comics",
  id: string,
  voice: CaptionVoice | null | undefined,
): string | null {
  const m = voice?.path.match(/^voice\/([1-9]|10)-([1-9])\.mp3$/);
  return m ? `/api/images/${kind}/${id}?panel=${m[1]}&voice=${m[2]}` : null;
}

/** 컷에서 틀 대사 음성: 자막 시작 시각과 주소. 넓은 그림 컷만 쓴다. */
export function voicesOf(
  kind: "posts" | "comics",
  id: string,
  panel: LivePanel | undefined,
): { atMs: number; url: string }[] {
  if (panel?.aspect !== "16:9") {
    return [];
  }
  return (panel.captions ?? []).flatMap((c) => {
    const url = voiceUrl(kind, id, c.voice);
    return url ? [{ atMs: c.startMs, url }] : [];
  });
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
  "meteor",
  "fireworks",
  "lightning",
  "sunbeam",
  "screen",
  "bokeh",
  "clouds",
  "bubbles",
  "glow",
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

/**
 * 화면 효과 알갱이 하나. 위치는 그림 기준 %, 크기는 px, 시간은 ms. layer는 거리 층(0 먼 층, 1 중간 층, 2 가까운 층)이고,
 * sway·spin·dx·dy는 알갱이마다 다른 흔들림·회전·떠다님(px, deg), tint는 색 토큰 이름이다.
 */
export type Particle = {
  x: number;
  y: number;
  width: number;
  height: number;
  delayMs: number;
  durationMs: number;
  layer: 0 | 1 | 2;
  opacity: number;
  blur: number;
  sway: number;
  spin: number;
  dx: number;
  dy: number;
  tint: string | null;
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

/** 종류별 알갱이 수·크기·속도. 화면 효과는 그림을 가리지 않게 작고 옅게 둔다. 크기·시간은 중간 층 기준이다. */
const RECIPES: Record<Ambient, Recipe> = {
  twinkle: {
    count: 28,
    y: [2, 55],
    x: [2, 98],
    width: [2, 5],
    durationMs: [1200, 3000],
  },
  rain: {
    count: 80,
    y: [0, 100],
    x: [-5, 100],
    width: [1, 1.5],
    height: [14, 26],
    durationMs: [550, 900],
  },
  snow: {
    count: 50,
    y: [0, 100],
    x: [0, 100],
    width: [3, 6],
    durationMs: [7000, 12000],
  },
  fireflies: {
    count: 18,
    y: [35, 92],
    x: [5, 95],
    width: [3, 5],
    durationMs: [4000, 7500],
  },
  petals: {
    count: 24,
    y: [0, 100],
    x: [0, 100],
    width: [7, 10],
    height: [5, 7],
    durationMs: [7000, 11000],
  },
  leaves: {
    count: 16,
    y: [0, 100],
    x: [0, 100],
    width: [9, 13],
    height: [6, 8],
    durationMs: [6000, 10000],
  },
  steam: {
    count: 7,
    y: [55, 72],
    x: [38, 62],
    width: [18, 30],
    durationMs: [3200, 4800],
  },
  dust: {
    count: 32,
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
  // 별똥별: 가끔 하나씩 하늘을 가로지른다(긴 주기 중 앞부분만 보인다)
  meteor: {
    count: 4,
    y: [2, 30],
    x: [30, 95],
    width: [90, 150],
    height: [2, 2],
    durationMs: [3500, 6000],
  },
  // 불꽃: 하늘 곳곳에서 차례로 터진다
  fireworks: {
    count: 5,
    y: [8, 45],
    x: [10, 90],
    width: [5, 5],
    durationMs: [1800, 2800],
  },
  // 번개: 그림 전체가 가끔 번쩍인다
  lightning: {
    count: 1,
    y: [0, 0],
    x: [0, 0],
    width: [0, 0],
    durationMs: [5200, 5200],
  },
  // 창빛: 창으로 드는 비스듬한 빛줄기 몇 개가 천천히 밝아졌다 옅어진다
  sunbeam: {
    count: 3,
    y: [-20, -20],
    x: [8, 70],
    width: [50, 110],
    height: [900, 900],
    durationMs: [7000, 11000],
  },
  // 화면 빛: 모니터·텔레비전의 푸른 빛이 그림 전체에 은은하게 깜빡인다
  screen: {
    count: 1,
    y: [0, 0],
    x: [0, 0],
    width: [0, 0],
    durationMs: [3800, 3800],
  },
  // 도시 불빛 번짐: 멀리 흐릿한 빛 동그라미가 떠 있다 숨 쉬듯 밝아진다
  bokeh: {
    count: 14,
    y: [8, 70],
    x: [0, 95],
    width: [14, 40],
    durationMs: [6000, 10000],
  },
  // 구름: 하늘 위쪽에서 흐릿한 구름이 아주 천천히 옆으로 흐른다
  clouds: {
    count: 4,
    y: [0, 22],
    x: [0, 100],
    width: [140, 260],
    height: [40, 70],
    durationMs: [45000, 75000],
  },
  // 비눗방울: 아래에서 위로 흔들리며 떠오른다
  bubbles: {
    count: 16,
    y: [0, 100],
    x: [5, 95],
    width: [8, 18],
    durationMs: [6000, 10000],
  },
  // 은은한 빛: 흐릿한 빛 방울이 천천히 떠다닌다(다른 효과가 없는 컷)
  glow: {
    count: 10,
    y: [5, 90],
    x: [0, 95],
    width: [22, 54],
    durationMs: [9000, 15000],
  },
};

/** 거리 층을 나누는 종류. 먼 것은 작고 느리고 옅게, 가까운 것은 크고 빠르고 흐리게 그려 평평한 무늬처럼 보이지 않게 한다. */
const LAYERED: readonly Ambient[] = [
  "rain",
  "snow",
  "petals",
  "leaves",
  "dust",
  "fireflies",
  "bubbles",
];

/**
 * 깊이 지도로 가리는 종류. 그림 속 공기나 하늘에 있는 것이라 앞쪽 인물 뒤로 지나가야 자연스럽다. 가까운 층(layer 2)은
 * 가리지 않아 몇 개는 인물 앞을 스친다. 그림 전체에 얹는 빛(불빛·번개·은은한 빛)과 김은 가리지 않는다.
 */
const BEHIND: readonly Ambient[] = [
  ...LAYERED,
  "twinkle",
  "meteor",
  "fireworks",
  "bokeh",
  "clouds",
];

export function ambientBehind(type: Ambient): boolean {
  return BEHIND.includes(type);
}

/** 층별 크기·시간·진하기·흐림 배율. */
const LAYERS = [
  { size: 0.6, time: 1.35, opacity: 0.5, blur: 0 },
  { size: 1, time: 1, opacity: 0.8, blur: 0 },
  { size: 1.7, time: 0.75, opacity: 0.95, blur: 1.5 },
] as const;

/** 섞어 쓰는 색 토큰(app/globals.css). 낙엽·꽃잎이 한 가지 색이면 스티커처럼 보인다. */
const TINTS: Partial<Record<Ambient, readonly string[]>> = {
  leaves: [
    "--ambient-leaf",
    "--ambient-leaf-red",
    "--ambient-leaf-gold",
    "--ambient-leaf-brown",
  ],
  petals: ["--ambient-petal", "--ambient-petal-pale", "--ambient-light"],
  bokeh: [
    "--ambient-warm",
    "--ambient-glow",
    "--ambient-screen",
    "--ambient-light",
  ],
};

/** 같은 컷은 늘 같은 자리에 둔다(화면이 다시 그려져도 알갱이가 튀지 않는다). */
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

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function between(r: () => number, [lo, hi]: [number, number]): number {
  return Math.round((lo + (hi - lo) * r()) * 10) / 10;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 먼 층이 가장 많고 가까운 층은 드물다(5:3.5:1.5). */
function pickLayer(r: () => number): 0 | 1 | 2 {
  const v = r();
  return v < 0.5 ? 0 : v < 0.85 ? 1 : 2;
}

/**
 * 종류별 알갱이 목록. seed(만화와 컷)마다 자리·바람 방향·흔들림이 달라 어느 컷이든 같은 무늬가 되풀이되지 않고, 같은
 * seed면 늘 같다. 시작 지연은 음수라 재생하자마자 화면 곳곳에 알갱이가 있다.
 */
export function ambientParticles(type: Ambient, seed = ""): Particle[] {
  const recipe = RECIPES[type];
  const r = random(
    hash(`${seed}|${type}`) ^ (AMBIENTS.indexOf(type) * 7919 + 17),
  );
  const layered = LAYERED.includes(type);
  // 컷 하나에는 바람이 한 방향으로 분다: 비는 기울기, 떨어지는 것은 흘러가는 쪽이 같다
  const wind = r() * 2 - 1;
  const tints = TINTS[type];
  return Array.from({ length: recipe.count }, () => {
    const layer = layered ? pickLayer(r) : 1;
    const f = LAYERS[layer];
    const durationMs = Math.round(between(r, recipe.durationMs) * f.time);
    const width = round(between(r, recipe.width) * f.size);
    const height = recipe.height
      ? round(between(r, recipe.height) * f.size)
      : width;
    const jitter = r() * 2 - 1;
    const sway =
      type === "rain"
        ? round(wind * 14 + jitter * 2)
        : round((wind * 0.6 + jitter * 0.8) * 40 * f.size);
    return {
      x: between(r, recipe.x),
      y: between(r, recipe.y),
      width,
      height,
      durationMs,
      delayMs: -Math.round(durationMs * r()),
      layer,
      opacity: round(f.opacity * (0.75 + r() * 0.25)),
      blur: f.blur,
      sway,
      spin: Math.round((r() < 0.5 ? -1 : 1) * (180 + r() * 360)),
      dx: Math.round((r() * 2 - 1) * 26),
      dy: Math.round((r() * 2 - 1) * 22),
      tint: tints ? tints[Math.floor(r() * tints.length)] : null,
    };
  });
}

/**
 * 깊이 지도(밝을수록 가깝다)의 밝기로 가림 마스크의 투명도를 만든다. 그림마다 깊이 값의 폭이 달라 밝기 순위로 자른다:
 * 가장 가까운 25%(앞쪽 인물·물건)는 가리고, 그 앞 20% 구간은 부드럽게 옅어진다. 나머지는 그대로 보인다.
 */
export function depthMaskAlpha(luma: ArrayLike<number>): Uint8ClampedArray {
  const sorted = Array.from(luma).sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  const lo = at(0.55);
  const hi = Math.max(at(0.75), lo + 1);
  const out = new Uint8ClampedArray(luma.length);
  for (let i = 0; i < luma.length; i++) {
    const t = Math.min(1, Math.max(0, (luma[i] - lo) / (hi - lo)));
    out[i] = Math.round(255 * (1 - t * t * (3 - 2 * t)));
  }
  return out;
}
