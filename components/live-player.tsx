"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { request } from "@/lib/api";
import {
  motionOn,
  needsCredit,
  nextIndex,
  panelImageUrl,
  prevIndex,
  SLIDE_MS,
  swipe,
} from "@/lib/live";
import { LiveAudio, type AudioFactory } from "@/lib/live-audio";
import type { LivePlayback, PanelSound } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** 라이브 모드 컷 그림 크기 (conversation-service ComicComposer.LIVE_SIZE). */
const PANEL_SIZE = 752;

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
  const [second, setSecond] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [reduced] = useState(reducedMotion);
  const audio = useRef<LiveAudio | null>(null);
  const touchX = useRef<number | null>(null);
  const panel = panels[index];
  const count = panels.length;

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

  // 자동 넘기기. 마지막 컷이 끝나면 멈추고 소리를 줄인다.
  useEffect(() => {
    if (!playing || !panel) {
      return;
    }
    const timer = setTimeout(() => {
      if (index >= count - 1) {
        setPlaying(false);
        audio.current?.play(null);
      } else {
        setIndex(nextIndex(index, count));
      }
    }, panel.durationMs);
    return () => clearTimeout(timer);
  }, [playing, index, panel, count]);

  // 움직이는 컷은 재생하는 동안 두 그림을 번갈아 보여 준다
  const moving = playing && motionOn(panel, reduced);
  const interval = panel?.motion?.intervalMs ?? 0;
  useEffect(() => {
    if (!moving) {
      return;
    }
    const timer = setInterval(() => setSecond((s) => !s), interval);
    return () => {
      clearInterval(timer);
      setSecond(false);
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
        className="aspect-square w-full animate-pulse rounded-lg bg-muted"
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
        className="relative aspect-square w-full touch-pan-y overflow-hidden rounded-lg bg-muted select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {panels.map((p, i) => (
          <div
            key={p.index}
            aria-hidden={i !== index}
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{
              opacity: i === index ? 1 : 0,
              transitionDuration: `${SLIDE_MS}ms`,
            }}
          >
            {/* 권한 확인 뒤 web이 바이트를 넘기는 주소라 next/image 최적화를 쓰지 않는다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={panelImageUrl(kind, id, p.index)}
              alt={`${title ?? "4컷"} ${p.index}컷`}
              width={PANEL_SIZE}
              height={PANEL_SIZE}
              draggable={false}
              className="size-full object-contain"
            />
            {p.motion && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={panelImageUrl(kind, id, p.index, true)}
                alt=""
                aria-hidden
                width={PANEL_SIZE}
                height={PANEL_SIZE}
                draggable={false}
                data-testid={`frame-b-${p.index}`}
                className="absolute inset-0 size-full object-contain transition-opacity ease-in-out"
                style={{
                  opacity: i === index && moving && second ? 1 : 0,
                  transitionDuration: `${Math.round(p.motion.intervalMs * 0.6)}ms`,
                }}
              />
            )}
          </div>
        ))}
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
