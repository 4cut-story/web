"use client";

import { useEffect, useRef, useState } from "react";

import {
  BREATH_MS,
  breathPhase,
  followLevel,
  MAX_PEOPLE,
  nearWeight,
  refinePeople,
  speakerIndex,
} from "@/lib/live";
import type { LivePerson } from "@/lib/types";
import {
  bindNewTexture,
  buildProgram,
  imageTexture,
  loadImage,
  webglOf,
} from "@/lib/webgl";

/** 깊이 지도로 앞쪽 무게를 만들 때 줄이는 크기(16:9). */
const MASK_WIDTH = 96;
const MASK_HEIGHT = 54;

/** 얼굴 자리를 다듬을 때 줄이는 크기(16:9, 그림 폭의 0.6% 단위). */
const FACE_WIDTH = 160;
const FACE_HEIGHT = 90;

/**
 * 라이브 모드 인물 움직임 (docs specs/003-live-mode FR-052). 넓은 그림을 WebGL로 그리며 인물 자리만 아주 조금 휘게 해 인물이 숨을 쉬고 몸을
 * 살짝 흔들고, 대사가 나오는 동안 말하는 인물이 소리 크기에 맞춰 고개를 끄덕이게 한다. 인물 자리(people)를 모르는 예전 만화는 깊이 지도의
 * 앞쪽이 함께 숨쉬고, 대사가 나오면 함께 들썩인다. 휘는 무게는 넓고 부드럽게 퍼져 인물 경계가 늘어나 보이지 않는다. 움직임 그림 여러 장은
 * 겹쳐 바꾼다. WebGL이 없거나 그림을 못 읽으면 아무것도 그리지 않아 아래 그림이 그대로 보인다.
 */
export function LivingPicture({
  images,
  shown,
  fadeMs,
  people,
  depth,
  speaker,
  level,
  playing,
  seed,
  width,
  height,
  className,
}: {
  /** 첫 그림과 움직임 그림(같은 크기, 4장까지). */
  images: string[];
  /** 지금 보여 줄 그림 번호. */
  shown: number;
  fadeMs: number;
  people: LivePerson[];
  /** 인물 자리를 모를 때 앞쪽을 찾는 깊이 지도. */
  depth: string | null;
  /** 지금 자막의 화자(호칭). */
  speaker: string | null;
  /** 지금 대사 소리 크기(0~1)를 읽는다. 그릴 때마다 부른다. */
  level: () => number;
  playing: boolean;
  seed: string;
  width: number;
  height: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const live = useRef({ shown, playing, speaker, level });
  const key = images.join("|");
  const who = JSON.stringify(people);

  useEffect(() => {
    live.current = { shown, playing, speaker, level };
  }, [shown, playing, speaker, level]);

  useEffect(() => {
    const gl = webglOf(canvas.current);
    const program = gl ? build(gl) : null;
    if (!gl || !program) {
      return;
    }
    let cancelled = false;
    let frame = 0;
    const known = people.length > 0;
    Promise.all([
      Promise.all(images.map(loadImage)),
      depth ? loadImage(depth).catch(() => null) : Promise.resolve(null),
    ])
      .then(([loaded, depthImage]) => {
        if (cancelled) {
          return;
        }
        const near = !known && depthImage ? mask(depthImage) : null;
        if (!known && !near) {
          return;
        }
        // 얼굴 자리는 깊이 지도로 다듬는다(LLM 자리는 옆으로 조금씩 비낀다)
        const refined =
          known && depthImage
            ? lumaOf(depthImage, FACE_WIDTH, FACE_HEIGHT)
            : null;
        const placed = refined
          ? refinePeople(people, refined, FACE_WIDTH, FACE_HEIGHT)
          : people;
        const textures = loaded.map((img, k) => imageTexture(gl, img, k));
        const nearTexture = near ? maskTexture(gl, near) : null;
        const weights = images.map((_, k) =>
          k === live.current.shown ? 1 : 0,
        );
        const phases = Array.from({ length: MAX_PEOPLE }, (_, k) =>
          breathPhase(seed, k),
        );
        let last = performance.now();
        let clock = 0;
        let voice = 0;
        const draw = (now: number) => {
          const dt = now - last;
          last = now;
          const { playing: on, shown: target } = live.current;
          if (on) {
            clock += dt;
          }
          const rate = fadeMs > 0 ? dt / fadeMs : 1;
          for (let k = 0; k < weights.length; k++) {
            const goal = k === target ? 1 : 0;
            weights[k] += Math.max(-rate, Math.min(rate, goal - weights[k]));
          }
          voice = followLevel(voice, on ? live.current.level() : 0, dt);
          const talking = speakerIndex(placed, live.current.speaker);
          render(gl, program, {
            textures,
            nearTexture,
            weights,
            people: placed,
            breaths: phases.map(
              (p) => (clock / BREATH_MS) * 2 * Math.PI * p.rate + p.phase,
            ),
            clock,
            talking,
            voice,
            aspect: width / height,
          });
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
    // 그림·인물이 바뀔 때만 다시 올린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, who, depth, fadeMs, seed]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      data-testid="living-picture"
      width={width}
      height={height}
      className={className}
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}

/** 깊이 지도를 작게 줄여 앞쪽 무게를 만든다. 읽지 못하면 null. */
function mask(img: HTMLImageElement): Uint8ClampedArray | null {
  const luma = lumaOf(img, MASK_WIDTH, MASK_HEIGHT);
  return luma ? nearWeight(luma, MASK_WIDTH, MASK_HEIGHT) : null;
}

/** 흑백 깊이 지도를 줄인 밝기. 읽지 못하면 null. */
function lumaOf(
  img: HTMLImageElement,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const luma = new Uint8ClampedArray(width * height);
  for (let i = 0; i < luma.length; i++) {
    luma[i] = data[i * 4];
  }
  return luma;
}

// 인물마다 몸 무게(얼굴 아래로 넓게 퍼진 부드러운 자리)와 머리 무게(얼굴 둘레)를 만든다.
// 숨쉬기: 몸 무게만큼 그림 아래쪽을 기준으로 세로로 아주 조금 늘었다 줄어든다. 흔들림: 몸이 발 쪽을 축으로 좌우로 조금 기운다.
// 말하기: 말하는 인물의 머리가 소리 크기만큼 아래로 끄덕이고 조금 기운다.
// 인물 자리를 모르면 깊이 지도로 만든 앞쪽 무게(near)로 숨쉬고, 대사 소리에 함께 들썩인다.
const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D img0;
uniform sampler2D img1;
uniform sampler2D img2;
uniform sampler2D img3;
uniform sampler2D near;
uniform vec4 weight;
uniform vec4 people[${MAX_PEOPLE}];
uniform vec4 breath;
uniform float count;
uniform float useNear;
uniform float talking;
uniform float voice;
uniform float clock;
uniform float aspect;

void main() {
  vec2 at = uv;
  float bottom = 1.0 - uv.y;
  for (int k = 0; k < ${MAX_PEOPLE}; k++) {
    if (float(k) >= count) {
      break;
    }
    vec4 p = people[k];
    float s = p.z;
    float dx = (uv.x - p.x) * aspect;
    // 몸: 어깨 폭쯤 옆으로, 정수리 조금 위에서부터 아래로
    float body = exp(-(dx * dx) / (s * s * 0.8))
      * smoothstep(p.y - s * 1.3, p.y - s * 0.4, uv.y);
    float b = k == 0 ? breath.x : (k == 1 ? breath.y : (k == 2 ? breath.z : breath.w));
    at.y += body * bottom * 0.0075 * sin(b);
    at.x += body * bottom * 0.0022 * sin(b * 0.5 + 1.3) / aspect;
    if (float(k) == talking) {
      vec2 d = vec2(dx, uv.y - p.y);
      float head = exp(-dot(d, d) / (s * s * 0.9));
      at.y -= head * voice * s * 0.05;
      at.x += head * voice * s * 0.02 * sin(clock * 0.0021) / aspect;
      at.y -= body * bottom * voice * 0.004;
    }
  }
  if (useNear > 0.5) {
    float n = texture2D(near, uv).r;
    at.y += n * bottom * (0.0065 * sin(breath.x) - voice * 0.006);
    at.x += n * bottom * 0.002 * sin(breath.x * 0.5 + 1.3) / aspect;
  }
  at = clamp(at, 0.001, 0.999);
  vec3 c = texture2D(img0, at).rgb * weight.x
    + texture2D(img1, at).rgb * weight.y
    + texture2D(img2, at).rgb * weight.z
    + texture2D(img3, at).rgb * weight.w;
  gl_FragColor = vec4(c / max(weight.x + weight.y + weight.z + weight.w, 0.001), 1.0);
}`;

type Uniforms = Record<
  | "weight"
  | "people"
  | "breath"
  | "count"
  | "useNear"
  | "talking"
  | "voice"
  | "clock"
  | "aspect",
  WebGLUniformLocation | null
>;

type Program = { program: WebGLProgram; u: Uniforms };

function build(gl: WebGLRenderingContext): Program | null {
  const program = buildProgram(gl, FRAGMENT, [
    "img0",
    "img1",
    "img2",
    "img3",
    "near",
  ]);
  if (!program) {
    return null;
  }
  const at = (name: string) => gl.getUniformLocation(program, name);
  return {
    program,
    u: {
      weight: at("weight"),
      people: at("people"),
      breath: at("breath"),
      count: at("count"),
      useNear: at("useNear"),
      talking: at("talking"),
      voice: at("voice"),
      clock: at("clock"),
      aspect: at("aspect"),
    },
  };
}

function maskTexture(
  gl: WebGLRenderingContext,
  near: Uint8ClampedArray,
): WebGLTexture | null {
  const t = bindNewTexture(gl, 4);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    MASK_WIDTH,
    MASK_HEIGHT,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    new Uint8Array(near.buffer, near.byteOffset, near.length),
  );
  return t;
}

function render(
  gl: WebGLRenderingContext,
  p: Program,
  s: {
    textures: (WebGLTexture | null)[];
    nearTexture: WebGLTexture | null;
    weights: number[];
    people: LivePerson[];
    breaths: number[];
    clock: number;
    talking: number;
    voice: number;
    aspect: number;
  },
) {
  // 그림이 네 장보다 적으면 남는 자리에 첫 그림을 둔다(무게 0)
  for (let k = 0; k < 4; k++) {
    gl.activeTexture(gl.TEXTURE0 + k);
    gl.bindTexture(gl.TEXTURE_2D, s.textures[k < s.textures.length ? k : 0]);
  }
  gl.activeTexture(gl.TEXTURE0 + 4);
  gl.bindTexture(gl.TEXTURE_2D, s.nearTexture ?? s.textures[0]);
  gl.uniform4f(
    p.u.weight,
    s.weights[0] ?? 1,
    s.weights[1] ?? 0,
    s.weights[2] ?? 0,
    s.weights[3] ?? 0,
  );
  const packed = new Float32Array(MAX_PEOPLE * 4);
  s.people.forEach((person, k) => {
    packed.set([person.x, person.y, person.size, 0], k * 4);
  });
  gl.uniform4fv(p.u.people, packed);
  gl.uniform4f(
    p.u.breath,
    s.breaths[0] ?? 0,
    s.breaths[1] ?? 0,
    s.breaths[2] ?? 0,
    s.breaths[3] ?? 0,
  );
  gl.uniform1f(p.u.count, s.people.length);
  gl.uniform1f(p.u.useNear, s.nearTexture ? 1 : 0);
  gl.uniform1f(p.u.talking, s.talking);
  gl.uniform1f(p.u.voice, s.voice);
  gl.uniform1f(p.u.clock, s.clock);
  gl.uniform1f(p.u.aspect, s.aspect);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
