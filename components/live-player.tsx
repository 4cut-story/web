"use client";

import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AmbientLayer } from "@/components/ambient-layer";
import { DepthParallax } from "@/components/depth-parallax";
import { LivingPicture } from "@/components/living-picture";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { request } from "@/lib/api";
import {
  ambientOn,
  cameraTransform,
  characterMotionOn,
  depthImageUrl,
  framesNeeded,
  frameAt,
  captionAt,
  isWide,
  motionOn,
  needsCredit,
  nextIndex,
  panelImageUrl,
  panelSizes,
  panelSrcSet,
  parallaxOn,
  peopleOf,
  prevIndex,
  SLIDE_MS,
  swipe,
  voicesOf,
} from "@/lib/live";
import { LiveAudio, type AudioFactory } from "@/lib/live-audio";
import type { LivePlayback, PanelSound } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** 라이브 모드 컷 그림 크기 (conversation-service ComicComposer.LIVE_SIZE). */
const PANEL_SIZE = 752;

/** 라이브 전용 넓은 그림 크기 (conversation-service DrawHandler.LIVE_WIDTH·LIVE_HEIGHT). */
const WIDE_WIDTH = 1024;
const WIDE_HEIGHT = 576;

/** 자막을 맞추는 시계 간격. */
const TICK_MS = 100;

/** 대사가 늦게 시작해 아직 나오면 컷을 넘기지 않고 기다리는 최대 시간. */
const VOICE_WAIT_MS = 5000;

/** 이 브라우저가 요소 전체 화면을 지원하는지 (아이폰 Safari 등은 아니다). */
function fullscreenEnabled(): boolean {
  return typeof document !== "undefined" && Boolean(document.fullscreenEnabled);
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 라이브 모드 재생기 (docs specs/003-live-mode). 컷을 한 장씩 넘기며 컷마다 배경음을 튼다. 움직이는 컷은 두 그림을 번갈아
 * 보여 준다. 재생 정보 JSON만 읽고, 소리는 "재생"을 누른 뒤에만 낸다.
 */
export function LivePlayer({
  kind,
  id,
  title,
  audioFactory,
}: {
  kind: "posts" | "comics";
  id: string;
  title?: string | null;
  /** 테스트에서 가짜 소리를 넣는다. */
  audioFactory?: AudioFactory;
}) {
  const loaded = useLoad(`${kind}/${id}/live`, () =>
    request<LivePlayback>(`/api/v1/${kind}/${id}/live`, { quiet: true }),
  );
  const panels = loaded.data?.panels ?? [];
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [reduced] = useState(reducedMotion);
  const audio = useRef<LiveAudio | null>(null);
  const touchX = useRef<number | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const [full, setFull] = useState(false);
  const [canFull] = useState(fullscreenEnabled);
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // 휴대폰에서는 가로 16:9 그림이 작으니 전체 화면으로 크게 본다
  function toggleFull() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void stage.current?.requestFullscreen().catch(() => undefined);
    }
  }
  const panel = panels[index];
  const count = panels.length;
  const wide = isWide(loaded.data);
  const [clock, setClock] = useState({ at: -1, ms: 0 });

  // 인물 움직임이 그릴 때마다 읽는 대사 소리 크기
  const voiceLevel = useCallback(() => audio.current?.voiceLevel() ?? 0, []);

  function player(): LiveAudio {
    audio.current ??= new LiveAudio(audioFactory);
    return audio.current;
  }

  // 화면을 떠나면 소리를 끄고 처음 상태로 돌린다. 뒤로 간 화면은 숨겨 둔 채 상태를 남겼다가 다시 보여 주므로,
  // 재생 상태를 지우지 않으면 돌아왔을 때 누르지 않아도 다시 재생된다.
  useEffect(
    () => () => {
      audio.current?.stop();
      audio.current = null;
      setStarted(false);
      setPlaying(false);
    },
    [],
  );

  // 컷이 바뀌면 그 컷 소리로 (같은 소리면 이어 튼다), 다음 컷 소리는 미리 받는다
  useEffect(() => {
    if (!started || !panel) {
      return;
    }
    player().play(panel.sound);
    player().effect(panel.effect);
    player().preload(panels[index + 1]?.sound);
    player().preload(panels[index + 1]?.effect);
    // panels는 불러온 뒤 바뀌지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index, panel]);

  // 대사 음성: 자막이 나오는 시각에 틀고, 컷을 넘기거나 멈추면 끊는다. 다음 컷 음성은 미리 받는다
  useEffect(() => {
    if (!playing || !panel) {
      return;
    }
    const a = player();
    [panel, panels[index + 1], panels[index + 2]].forEach((p) =>
      voicesOf(kind, id, p).forEach((v) => a.preloadVoice(v.url)),
    );
    const timers = voicesOf(kind, id, panel).map((v) =>
      setTimeout(() => a.voice(v.url), v.atMs),
    );
    return () => {
      timers.forEach(clearTimeout);
      a.stopVoice();
    };
    // panels는 불러온 뒤 바뀌지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, panel, kind, id]);

  // 자동 넘기기. 마지막 컷이 끝나면 멈추고 소리를 줄인다.
  useEffect(() => {
    if (!playing || !panel) {
      return;
    }
    // 대사가 늦게 시작해 아직 나오는 중이면 끝날 때까지(최대 VOICE_WAIT_MS) 컷을 넘기지 않는다
    let waited = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      if (audio.current?.isSpeaking() && waited < VOICE_WAIT_MS) {
        waited += TICK_MS;
        timer = setTimeout(advance, TICK_MS);
        return;
      }
      if (index >= count - 1) {
        setPlaying(false);
        audio.current?.play(null);
      } else {
        setIndex(nextIndex(index, count));
      }
    };
    timer = setTimeout(advance, panel.durationMs);
    return () => clearTimeout(timer);
  }, [playing, index, panel, count]);

  // 넓은 그림 컷의 자막 시계. 컷이 바뀌면 처음부터 센다
  const hasCaptions = Boolean(panel?.captions?.length);
  useEffect(() => {
    if (!playing || !hasCaptions) {
      return;
    }
    const begun = Date.now();
    const timer = setInterval(
      () => setClock({ at: index, ms: Date.now() - begun }),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [playing, index, hasCaptions]);
  // 멈췄거나 아직 재생 전이면 첫 자막을 보여 준다
  const elapsed = clock.at === index ? clock.ms : 0;
  const caption = captionAt(
    panel,
    playing ? elapsed : (panel?.captions?.[0]?.startMs ?? 0),
  );

  // 움직이는 컷은 재생하는 동안 그림 두세 장을 차례로 오가며 보여 준다
  const moving = playing && motionOn(panel, reduced);
  const interval = panel?.motion?.intervalMs ?? 0;
  useEffect(() => {
    if (!moving) {
      return;
    }
    const timer = setInterval(() => setStep((s) => s + 1), interval);
    return () => {
      clearInterval(timer);
      setStep(0);
    };
  }, [moving, interval, index]);

  useEffect(() => {
    audio.current?.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    audio.current?.setVolume(volume);
  }, [volume]);

  function start() {
    const a = player();
    a.start();
    a.setVolume(volume);
    a.setMuted(muted);
    if (index >= count - 1) {
      setIndex(0);
    }
    setStarted(true);
    setPlaying(true);
  }

  function go(to: number) {
    setIndex(to);
  }

  function onKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      go(nextIndex(index, count));
    } else if (event.key === "ArrowLeft") {
      go(prevIndex(index));
    } else {
      return;
    }
    event.preventDefault();
  }

  if (loaded.error) {
    return (
      <ErrorText message={loaded.error.message} code={loaded.error.code} />
    );
  }
  if (!panel) {
    return (
      <div
        aria-busy="true"
        className={`${wide ? "aspect-video" : "aspect-square"} w-full animate-pulse rounded-lg bg-muted`}
      />
    );
  }

  return (
    <section
      aria-label="라이브 모드"
      aria-roledescription="슬라이드"
      className="flex flex-col gap-3"
    >
      <div
        ref={stage}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          touchX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (touchX.current === null) {
            return;
          }
          const way = swipe(e.clientX - touchX.current);
          touchX.current = null;
          if (way === "next") {
            go(nextIndex(index, count));
          } else if (way === "prev") {
            go(prevIndex(index));
          }
        }}
        className={`relative ${wide ? "aspect-video" : "aspect-square"} w-full touch-pan-y overflow-hidden rounded-lg bg-muted select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${full ? "rounded-none bg-foreground" : ""}`}
      >
        {panels.map((p, i) => {
          const pWide = p.aspect === "16:9";
          const width = pWide ? WIDE_WIDTH : PANEL_SIZE;
          const height = pWide ? WIDE_HEIGHT : PANEL_SIZE;
          const camera = cameraTransform(p.camera, reduced);
          const active = i === index && playing;
          return (
            <div
              key={p.index}
              aria-hidden={i !== index}
              data-testid={`panel-${p.index}`}
              className="absolute inset-0 transition-[opacity,transform] ease-in-out"
              style={{
                opacity: i === index ? 1 : 0,
                transform: active ? camera.to : camera.from,
                transitionDuration: `${SLIDE_MS}ms, ${active ? p.durationMs : SLIDE_MS}ms`,
                transitionTimingFunction: "ease-in-out, linear",
              }}
            >
              {/* 권한 확인 뒤 web이 바이트를 넘기는 주소라 next/image 최적화를 쓰지 않는다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={panelImageUrl(kind, id, p.index)}
                srcSet={panelSrcSet(panelImageUrl(kind, id, p.index))}
                sizes={panelSizes(full)}
                alt={`${title ?? "4컷"} ${p.index}컷`}
                width={width}
                height={height}
                draggable={false}
                className={`size-full ${pWide && !full ? "object-cover" : "object-contain"}`}
              />
              {framesNeeded(i, index) &&
                p.motion?.frames.slice(1).map((_, k) => {
                  const n = k + 1;
                  const shown =
                    i === index &&
                    moving &&
                    frameAt(step, p.motion!.frames.length) === n;
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={n}
                      src={panelImageUrl(kind, id, p.index, n)}
                      srcSet={panelSrcSet(panelImageUrl(kind, id, p.index, n))}
                      sizes={panelSizes(full)}
                      alt=""
                      aria-hidden
                      width={width}
                      height={height}
                      draggable={false}
                      data-testid={`frame-${n === 1 ? "b" : "c"}-${p.index}`}
                      className={`absolute inset-0 size-full ${pWide && !full ? "object-cover" : "object-contain"} transition-opacity ease-in-out`}
                      style={{
                        opacity: shown ? 1 : 0,
                        transitionDuration: `${Math.round(p.motion!.intervalMs * 0.6)}ms`,
                      }}
                    />
                  );
                })}
              {i === index && parallaxOn(p, reduced) && (
                <DepthParallax
                  images={[
                    panelImageUrl(kind, id, p.index),
                    ...(p.motion?.frames
                      .slice(1)
                      .map((_, k) => panelImageUrl(kind, id, p.index, k + 1)) ??
                      []),
                  ]}
                  depth={depthImageUrl(kind, id, p.index)}
                  shown={
                    moving ? frameAt(step, p.motion?.frames.length ?? 1) : 0
                  }
                  fadeMs={p.motion ? Math.round(p.motion.intervalMs * 0.6) : 0}
                  camera={p.camera}
                  durationMs={p.durationMs}
                  playing={playing}
                  width={width}
                  height={height}
                  className={`absolute inset-0 size-full ${full ? "object-contain" : "object-cover"}`}
                />
              )}
              {i === index &&
                !parallaxOn(p, reduced) &&
                characterMotionOn(p, reduced) && (
                  <LivingPicture
                    images={[
                      panelImageUrl(kind, id, p.index),
                      ...(p.motion?.frames
                        .slice(1)
                        .map((_, k) =>
                          panelImageUrl(kind, id, p.index, k + 1),
                        ) ?? []),
                    ]}
                    shown={
                      moving ? frameAt(step, p.motion?.frames.length ?? 1) : 0
                    }
                    fadeMs={
                      p.motion ? Math.round(p.motion.intervalMs * 0.6) : 0
                    }
                    people={peopleOf(p)}
                    depth={p.depth ? depthImageUrl(kind, id, p.index) : null}
                    speaker={playing ? (caption?.speaker ?? null) : null}
                    level={voiceLevel}
                    playing={playing}
                    seed={`${id}:${p.index}`}
                    width={width}
                    height={height}
                    className={`absolute inset-0 size-full ${pWide && !full ? "object-cover" : "object-contain"}`}
                  />
                )}
              {i === index && (
                <AmbientLayer
                  types={ambientOn(p, reduced)}
                  playing={playing}
                  seed={`${id}:${p.index}`}
                  depth={
                    pWide && p.depth ? depthImageUrl(kind, id, p.index) : null
                  }
                  fit={pWide && !full ? "cover" : "contain"}
                />
              )}
            </div>
          );
        })}
        {caption && (
          <p
            aria-live="polite"
            className="absolute inset-x-4 bottom-4 mx-auto w-fit max-w-[90%] rounded-md bg-foreground/75 px-3 py-1.5 text-center text-sm text-background sm:text-base"
          >
            {caption.speaker && (
              <span className="mr-1.5 font-semibold">{caption.speaker}</span>
            )}
            {caption.text}
          </p>
        )}
        {!playing && (
          <button
            type="button"
            onClick={start}
            aria-label={started ? "다시 재생" : "재생"}
            className="absolute inset-0 flex items-center justify-center bg-foreground/20 text-background focus-visible:outline-none"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-foreground/70">
              <Play className="size-8 translate-x-0.5" aria-hidden />
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="이전 컷"
          disabled={index === 0}
          onClick={() => go(prevIndex(index))}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={playing ? "일시 정지" : "재생"}
          onClick={() => (playing ? setPlaying(false) : start())}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="다음 컷"
          disabled={index >= count - 1}
          onClick={() => go(nextIndex(index, count))}
        >
          <ChevronRight aria-hidden />
        </Button>
        <span
          className="ml-1 text-sm text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {index + 1} / {count}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label={muted ? "소리 켜기" : "소리 끄기"}
          aria-pressed={muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
        </Button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          aria-label="소리 크기"
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-24 accent-primary"
        />
        {canFull && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={full ? "전체 화면 끝내기" : "전체 화면"}
            aria-pressed={full}
            onClick={toggleFull}
          >
            {full ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
          </Button>
        )}
      </div>
      <Credit sound={panel.sound} />
      <Credit sound={panel.effect ?? null} label="효과음" />
    </section>
  );
}

/** CC BY 소리는 저작자를 밝힌다. */
function Credit({
  sound,
  label = "소리",
}: {
  sound: PanelSound | null;
  label?: string;
}) {
  if (!sound) {
    return null;
  }
  const credit = sound.credit;
  return (
    <p className="text-xs text-muted-foreground">
      {label}: {sound.title}
      {needsCredit(sound) && credit && (
        <>
          {" · "}
          {credit.sourceUrl ? (
            <a
              href={credit.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {credit.originalTitle ?? sound.title}
            </a>
          ) : (
            (credit.originalTitle ?? sound.title)
          )}
          {credit.author && ` · ${credit.author}`}
          {credit.license && (
            <>
              {" · "}
              {credit.licenseUrl ? (
                <a
                  href={credit.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {credit.license}
                </a>
              ) : (
                credit.license
              )}
            </>
          )}
        </>
      )}
    </p>
  );
}
