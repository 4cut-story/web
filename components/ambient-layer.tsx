"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import {
  ambientBehind,
  ambientParticles,
  depthMaskAlpha,
  type Particle,
} from "@/lib/live";
import type { Ambient } from "@/lib/types";

/** 깊이 지도를 줄여 읽는 크기. 가장자리가 부드러워지고 계산도 가볍다. */
const MASK_WIDTH = 160;

/**
 * 라이브 모드 화면 효과 층 (docs specs/003-live-mode FR-040~043). 그림 위에 별빛·비·눈 같은 작은 움직임을 CSS로 그린다.
 * GPU 그림이 들지 않는다. 멈춰 있으면 움직임도 멈춘다. seed(만화와 컷)마다 알갱이 자리와 바람이 달라 같은 무늬가 되풀이되지
 * 않는다. 깊이 지도가 있으면 먼 층·중간 층 알갱이를 앞쪽 인물 뒤로 보내고, 가까운 층만 인물 앞을 지나게 한다.
 */
export function AmbientLayer({
  types,
  playing,
  seed = "",
  depth,
  fit = "cover",
}: {
  types: Ambient[];
  playing: boolean;
  seed?: string;
  /** 깊이 지도 주소(밝을수록 가깝다). 없거나 읽지 못하면 가리지 않는다. */
  depth?: string | null;
  /** 그림이 놓인 방식. 마스크를 그림과 같은 자리에 맞춘다. */
  fit?: "cover" | "contain";
}) {
  const mask = useDepthMask(types.some(ambientBehind) ? depth : null);
  if (types.length === 0) {
    return null;
  }
  const behind: ReactNode[] = [];
  const front: ReactNode[] = [];
  for (const type of types) {
    ambientParticles(type, seed).forEach((p, k) => {
      const dot = (
        <span
          key={`${type}-${k}`}
          data-ambient={type}
          data-layer={p.layer}
          className={`ambient ambient-${type}`}
          style={particleStyle(p, playing)}
        />
      );
      (ambientBehind(type) && p.layer < 2 ? behind : front).push(dot);
    });
  }
  const masked: CSSProperties | undefined = mask
    ? {
        maskImage: `url(${mask})`,
        WebkitMaskImage: `url(${mask})`,
        maskSize: fit,
        WebkitMaskSize: fit,
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }
    : undefined;
  return (
    <div
      aria-hidden
      data-testid="ambient"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {behind.length > 0 && (
        <div
          data-testid="ambient-behind"
          data-masked={mask ? "true" : "false"}
          className="absolute inset-0"
          style={masked}
        >
          {behind}
        </div>
      )}
      {front}
    </div>
  );
}

function particleStyle(p: Particle, playing: boolean): CSSProperties {
  return {
    left: `${p.x}%`,
    top: `${p.y}%`,
    width: `${p.width}px`,
    height: `${p.height}px`,
    animationDuration: `${p.durationMs}ms`,
    animationDelay: `${p.delayMs}ms`,
    animationPlayState: playing ? "running" : "paused",
    ...(p.blur > 0 ? { filter: `blur(${p.blur}px)` } : {}),
    ...({
      "--alpha": p.opacity,
      "--sway": `${p.sway}px`,
      "--tilt": `${p.sway}deg`,
      "--drift": `${Math.round(-p.sway * 3.5)}px`,
      "--spin": `${p.spin}deg`,
      "--dx": `${p.dx}px`,
      "--dy": `${p.dy}px`,
      ...(p.tint ? { "--tint": `var(${p.tint})` } : {}),
    } as CSSProperties),
  };
}

/** 깊이 지도를 읽어 앞쪽(밝은 곳)이 투명한 마스크 그림을 만든다. 실패하면 null이라 가리지 않는다. */
function useDepthMask(url: string | null | undefined): string | null {
  const [mask, setMask] = useState<{ url: string; data: string } | null>(null);
  useEffect(() => {
    if (!url || typeof document === "undefined") {
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth) {
        return;
      }
      try {
        const w = MASK_WIDTH;
        const h = Math.max(
          1,
          Math.round((img.naturalHeight / img.naturalWidth) * w),
        );
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h);
        const luma = new Uint8ClampedArray(w * h);
        for (let i = 0; i < luma.length; i++) {
          luma[i] = pixels.data[i * 4];
        }
        const alpha = depthMaskAlpha(luma);
        for (let i = 0; i < alpha.length; i++) {
          pixels.data[i * 4] = 255;
          pixels.data[i * 4 + 1] = 255;
          pixels.data[i * 4 + 2] = 255;
          pixels.data[i * 4 + 3] = alpha[i];
        }
        ctx.putImageData(pixels, 0, 0);
        setMask({ url, data: canvas.toDataURL("image/png") });
      } catch {
        // 그림을 읽지 못하면 가리지 않는다
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return mask && mask.url === url ? mask.data : null;
}
