import type {
  Camera,
  Caption,
  LivePanel,
  LivePlayback,
  PanelSound,
} from "./types";

/** 라이브 모드 (docs specs/003-live-mode). 재생기 상태 계산은 여기 순수 함수로 두고 테스트한다. */

/** 컷이 넘어갈 때 그림이 겹쳐 바뀌는 시간. */
export const SLIDE_MS = 400;

/** 컷 그림 주소 (web 이미지 중계). second면 움직임 컷의 두 번째 그림. */
export function panelImageUrl(
  kind: "posts" | "comics",
  id: string,
  index: number,
  second = false,
): string {
  return `/api/images/${kind}/${id}?panel=${index}${second ? "&frame=b" : ""}`;
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
