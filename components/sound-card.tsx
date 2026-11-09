"use client";

import { Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  LICENSE_LABELS,
  categoryLabel,
  durationLabel,
  moodLabel,
  soundAudioUrl,
} from "@/lib/sounds";
import type { Sound, SoundCredit } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 화면에서 한 번에 한 소리만 재생한다. toggle(id)로 켜고 끈다. */
export function useSoundPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  function toggle(id: string) {
    audio.current?.pause();
    if (playing === id) {
      setPlaying(null);
      return;
    }
    const next = new Audio(soundAudioUrl(id));
    next.onended = () => setPlaying((p) => (p === id ? null : p));
    audio.current = next;
    setPlaying(id);
    next.play().catch(() => setPlaying(null));
  }

  return { playing, toggle };
}

export function PlayButton({
  sound,
  playing,
  onToggle,
  className,
}: {
  sound: Sound;
  playing: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const Icon = playing ? Pause : Play;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${sound.title} ${playing ? "멈추기" : "듣기"}`}
      aria-pressed={playing}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90",
        className,
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}

/** 저작자 표시: "원본 제목 · 저작자 · 라이선스" (출처와 라이선스로 가는 링크). */
export function CreditLine({ credit }: { credit: SoundCredit }) {
  return (
    <span className="text-xs text-muted-foreground">
      <a
        href={credit.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="underline-offset-2 hover:underline"
      >
        {credit.originalTitle ? `${credit.originalTitle} · ` : ""}
        {credit.author}
      </a>
      {" · "}
      <a
        href={credit.licenseUrl}
        target="_blank"
        rel="noreferrer"
        className="underline-offset-2 hover:underline"
      >
        {LICENSE_LABELS[credit.license] ?? credit.license}
      </a>
    </span>
  );
}

export function MoodChips({ moods }: { moods: string[] }) {
  if (moods.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-1" aria-label="분위기">
      {moods.map((m) => (
        <li
          key={m}
          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {moodLabel(m)}
        </li>
      ))}
    </ul>
  );
}

/** 배경음 한 칸: 듣기 버튼, 제목(상세 링크), 카테고리·길이, 설명, 분위기, 저작자 표시. */
export function SoundCard({
  sound,
  playing,
  onToggle,
}: {
  sound: Sound;
  playing: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="bg-card flex h-full flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <PlayButton sound={sound} playing={playing} onToggle={onToggle} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/sounds/${sound.id}`}
            className="block truncate text-base font-semibold hover:underline"
          >
            {sound.title}
          </Link>
          <span className="block truncate text-xs text-muted-foreground">
            {categoryLabel(sound.category)} · {durationLabel(sound.durationMs)}
          </span>
        </div>
      </div>
      <p className="line-clamp-3 text-sm">{sound.description}</p>
      <MoodChips moods={sound.moods} />
      <div className="mt-auto">
        <CreditLine credit={sound.credit} />
      </div>
    </article>
  );
}
