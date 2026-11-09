"use client";

import { useEffect, useRef, useState } from "react";

import { parallaxAt } from "@/lib/live";
import type { Camera } from "@/lib/types";

/**
 * 라이브 모드 깊이 패럴랙스 (docs specs/003-live-mode FR-048). 넓은 그림과 깊이 지도(밝을수록 가깝다)를 WebGL로 그려, 가까운
 * 것은 많이 먼 것은 적게 움직여 입체로 보이게 한다. 움직임 컷이면 그림 여러 장을 같은 깊이 지도로 겹쳐 바꾼다. WebGL이 없거나
 * 그림을 못 읽으면 아무것도 그리지 않아 아래 평면 그림이 그대로 보인다.
 */
export function DepthParallax({
  images,
  depth,
  shown,
  fadeMs,
  camera,
  durationMs,
  playing,
  width,
  height,
  className,
}: {
  /** 첫 그림과 움직임 그림(같은 크기). */
  images: string[];
  depth: string;
  /** 지금 보여 줄 그림 번호. */
  shown: number;
  fadeMs: number;
  camera: Camera | undefined;
  durationMs: number;
  playing: boolean;
  width: number;
  height: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const target = useRef(shown);
  const running = useRef(playing);
  const key = images.join("|");

  useEffect(() => {
    target.current = shown;
    running.current = playing;
  }, [shown, playing]);

  useEffect(() => {
    const el = canvas.current;
    const gl = el?.getContext("webgl", { premultipliedAlpha: false }) ?? null;
    if (!el || !gl) {
      return;
    }
    let cancelled = false;
    let frame = 0;
    const program = build(gl);
    if (!program) {
      return;
    }
    const sources = [...images, depth];
    Promise.all(sources.map(load))
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        const textures = loaded.map((img, k) => texture(gl, img, k));
        const weights = images.map((_, k) => (k === target.current ? 1 : 0));
        const started = performance.now();
        let last = started;
        let pausedAt = 0;
        let paused = 0;
        const draw = (now: number) => {
          if (!running.current) {
            pausedAt ||= now;
            frame = requestAnimationFrame(draw);
            return;
          }
          if (pausedAt) {
            paused += now - pausedAt;
            pausedAt = 0;
          }
          const elapsed = now - started - paused;
          const rate = fadeMs > 0 ? (now - last) / fadeMs : 1;
          last = now;
          for (let k = 0; k < weights.length; k++) {
            const goal = k === target.current ? 1 : 0;
            weights[k] += Math.max(-rate, Math.min(rate, goal - weights[k]));
          }
          const p = parallaxAt(camera, elapsed / durationMs, elapsed);
          render(gl, program, textures, weights, p);
          frame = requestAnimationFrame(draw);
        };
        setReady(true);
        frame = requestAnimationFrame(draw);
      })
      .catch(() => {
        // 그림을 못 읽으면 평면 그림을 그대로 둔다
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // 그림 목록이 바뀔 때만 다시 올린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, depth, camera, durationMs, fadeMs]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      data-testid="depth-parallax"
      width={width}
      height={height}
      className={className}
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

const VERTEX = `
attribute vec2 a;
varying vec2 uv;
void main() {
  uv = vec2((a.x + 1.0) * 0.5, (1.0 - a.y) * 0.5);
  gl_Position = vec4(a, 0.0, 1.0);
}`;

// 가까운 곳(깊이 1)은 offset만큼, 먼 곳(0)은 반대로 조금 움직인다. zoom은 가까운 것만 화면 가운데에서 더 키운다.
// 가장자리가 비지 않게 조금 확대해서 그린다.
const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D img0;
uniform sampler2D img1;
uniform sampler2D img2;
uniform sampler2D depth;
uniform vec3 weight;
uniform vec2 offset;
uniform float zoom;
void main() {
  vec2 base = (uv - 0.5) / 1.12 + 0.5;
  float d = texture2D(depth, base).r - 0.45;
  vec2 at = base - offset * d - (base - 0.5) * zoom * d;
  at = clamp(at, 0.001, 0.999);
  vec3 c = texture2D(img0, at).rgb * weight.x
    + texture2D(img1, at).rgb * weight.y
    + texture2D(img2, at).rgb * weight.z;
  gl_FragColor = vec4(c / max(weight.x + weight.y + weight.z, 0.001), 1.0);
}`;

type Program = {
  program: WebGLProgram;
  weight: WebGLUniformLocation | null;
  offset: WebGLUniformLocation | null;
  zoom: WebGLUniformLocation | null;
};

function build(gl: WebGLRenderingContext): Program | null {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) {
      return null;
    }
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) {
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const a = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  ["img0", "img1", "img2"].forEach((name, k) =>
    gl.uniform1i(gl.getUniformLocation(program, name), k),
  );
  gl.uniform1i(gl.getUniformLocation(program, "depth"), 3);
  return {
    program,
    weight: gl.getUniformLocation(program, "weight"),
    offset: gl.getUniformLocation(program, "offset"),
    zoom: gl.getUniformLocation(program, "zoom"),
  };
}

function texture(
  gl: WebGLRenderingContext,
  img: HTMLImageElement,
  index: number,
): WebGLTexture | null {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  return t;
}

function render(
  gl: WebGLRenderingContext,
  p: Program,
  textures: (WebGLTexture | null)[],
  weights: number[],
  at: { x: number; y: number; zoom: number },
) {
  const images = textures.length - 1;
  // 그림이 세 장보다 적으면 남는 자리에 첫 그림을 둔다(무게 0)
  for (let k = 0; k < 3; k++) {
    gl.activeTexture(gl.TEXTURE0 + k);
    gl.bindTexture(gl.TEXTURE_2D, textures[k < images ? k : 0]);
  }
  gl.activeTexture(gl.TEXTURE0 + 3);
  gl.bindTexture(gl.TEXTURE_2D, textures[images]);
  gl.uniform3f(p.weight, weights[0] ?? 1, weights[1] ?? 0, weights[2] ?? 0);
  gl.uniform2f(p.offset, at.x, at.y);
  gl.uniform1f(p.zoom, at.zoom);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
