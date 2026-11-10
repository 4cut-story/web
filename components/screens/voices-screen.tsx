"use client";

import { AudioWaveform, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import {
  AGE_LABELS,
  DIALECT_LABELS,
  EMOTIONS,
  GENDER_LABELS,
  VOICES,
  type Voice,
  type VoiceEmotion,
  type VoiceGender,
  groupVoices,
  voiceAudioUrl,
} from "@/lib/voices";
import { cn } from "@/lib/utils";

type Playing = { id: string; emotion: VoiceEmotion } | null;

/** 화면에서 한 번에 한 목소리만 재생한다. 같은 버튼을 다시 누르면 멈춘다. */
function useVoicePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<Playing>(null);

  useEffect(() => () => audio.current?.pause(), []);

  function toggle(id: string, emotion: VoiceEmotion) {
    audio.current?.pause();
    if (playing?.id === id && playing.emotion === emotion) {
      setPlaying(null);
      return;
    }
    const next = new Audio(voiceAudioUrl(id, emotion));
    next.onended = () =>
      setPlaying((p) => (p?.id === id && p.emotion === emotion ? null : p));
    audio.current = next;
    setPlaying({ id, emotion });
    next.play().catch(() => setPlaying(null));
  }

  return { playing, toggle };
}

const GENDERS: { value: VoiceGender | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "female", label: GENDER_LABELS.female },
  { value: "male", label: GENDER_LABELS.male },
];

/**
 * 가상 인물 목소리(/voices). 라이브 모드에서 대사를 읽는 목소리를 성별로 거르고 연령대·사투리로 묶어 보여 준다.
 * 카드마다 감정(기본·기쁨·화남·슬픔·놀람) 버튼으로 실제로 읽힌 대사를 들어 본다.
 */
export function VoicesScreen({ voices = VOICES }: { voices?: Voice[] }) {
  const [gender, setGender] = useState<VoiceGender | "">("");
  const player = useVoicePlayer();
  const groups = groupVoices(voices, gender);

  return (
    <AppShell title="목소리" tab="voices" width="wide">
      <div className="flex flex-col gap-3 pb-4">
        <p className="text-sm text-muted-foreground">
          라이브 모드에서 대사를 읽어 줄 가상 인물들이에요. 실제 사람의 녹음을
          쓰지 않고 &ldquo;70대 남성, 낮고 따뜻한 목소리&rdquo; 같은 글
          설명만으로 목소리를 만들었어요. 캐릭터의 성별·연령대와 사투리에 맞는
          인물이 대사를 읽고, 감정마다 말투가 달라져요.
        </p>
        <div
          role="radiogroup"
          aria-label="성별"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0"
        >
          {GENDERS.map((g) => (
            <button
              key={g.value || "ALL"}
              type="button"
              role="radio"
              aria-checked={gender === g.value}
              onClick={() => setGender(g.value)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                gender === g.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      {groups.length === 0 && (
        <EmptyState
          icon={AudioWaveform}
          title="목소리를 준비하고 있어요"
          description="곧 들어 볼 수 있어요."
        />
      )}
      <div className="flex flex-col gap-6 pb-8">
        {groups.map((g) => (
          <section
            key={g.title}
            aria-label={g.title}
            className="flex flex-col gap-3"
          >
            <h2 className="text-lg font-semibold">{g.title}</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {g.voices.map((v) => (
                <li key={v.id}>
                  <VoiceCard
                    voice={v}
                    playing={
                      player.playing?.id === v.id
                        ? player.playing.emotion
                        : null
                    }
                    onToggle={(e) => player.toggle(v.id, e)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

/** 목소리 한 칸: 이름, 성별·연령대·사투리·톤, 설명, 감정별 듣기 버튼, 재생 중인 대사. */
export function VoiceCard({
  voice,
  playing,
  onToggle,
}: {
  voice: Voice;
  playing: VoiceEmotion | null;
  onToggle: (emotion: VoiceEmotion) => void;
}) {
  const tags = [
    GENDER_LABELS[voice.gender],
    AGE_LABELS[voice.ageGroup],
    voice.dialect ? DIALECT_LABELS[voice.dialect] : null,
    voice.tone,
  ].filter(Boolean);
  const emotions = EMOTIONS.filter((e) => voice.samples[e.value]);
  const line = playing ? voice.samples[playing]?.text : null;
  return (
    <article className="bg-card flex h-full flex-col gap-2 rounded-xl border border-border p-4">
      <h3 className="text-base font-semibold">{voice.name}</h3>
      <span className="text-xs text-muted-foreground">{tags.join(" · ")}</span>
      <p className="text-sm">{voice.description}</p>
      {voice.traits && voice.traits.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="특징">
          {voice.traits.map((t) => (
            <li
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
      <div
        role="group"
        aria-label={`${voice.name} 감정별 듣기`}
        className="flex flex-wrap gap-2"
      >
        {emotions.map((e) => {
          const on = playing === e.value;
          const Icon = on ? Pause : Play;
          return (
            <button
              key={e.value}
              type="button"
              aria-pressed={on}
              aria-label={`${voice.name} ${e.label} ${on ? "멈추기" : "듣기"}`}
              onClick={() => onToggle(e.value)}
              className={cn(
                "flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {e.label}
            </button>
          );
        })}
      </div>
      {line && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          &ldquo;{line}&rdquo;
        </p>
      )}
    </article>
  );
}
