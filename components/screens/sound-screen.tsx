"use client";

import { AudioLines } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorText } from "@/components/empty-state";
import {
  CreditLine,
  MoodChips,
  SoundCard,
  useSoundPlayer,
} from "@/components/sound-card";
import { api } from "@/lib/api";
import {
  LICENSE_LABELS,
  SOUND_KINDS,
  categoryLabel,
  durationLabel,
  soundAudioUrl,
} from "@/lib/sounds";
import type { SoundDetail } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** 배경음 상세(/sounds/[id]): 플레이어, 설명, 장소, 분위기, 저작자 표시, 소리가 비슷한 배경음. */
export function SoundScreen({ id }: { id: string }) {
  const detail = useLoad(`/sounds/${id}`, () =>
    api.get<SoundDetail>(`/sounds/${id}`),
  );
  const player = useSoundPlayer();
  const sound = detail.data?.sound;
  return (
    <AppShell
      title={sound?.title ?? "배경음"}
      back={{ href: "/sounds", label: "배경음" }}
      width="medium"
    >
      {detail.error && (
        <ErrorText message={detail.error.message} code={detail.error.code} />
      )}
      {sound && (
        <div className="flex flex-col gap-4 pb-6">
          <p className="text-sm text-muted-foreground">
            {SOUND_KINDS.find((k) => k.value === sound.kind)?.label} ·{" "}
            {categoryLabel(sound.category)} · {durationLabel(sound.durationMs)}
          </p>
          <audio
            controls
            preload="none"
            src={soundAudioUrl(sound.id)}
            className="w-full"
          >
            <track kind="captions" />
          </audio>
          <p className="text-base leading-relaxed">{sound.description}</p>
          <MoodChips moods={sound.moods} />
          {sound.places.length > 0 && (
            <p className="text-sm text-muted-foreground">
              어울리는 장소: {sound.places.join(", ")}
            </p>
          )}
          <section className="rounded-xl bg-muted p-4 text-sm">
            <h2 className="mb-1 font-semibold">출처와 라이선스</h2>
            <p>
              {sound.credit.source} ·{" "}
              {LICENSE_LABELS[sound.credit.license] ?? sound.credit.license}
            </p>
            <CreditLine credit={sound.credit} />
          </section>
          {detail.data && detail.data.similar.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">소리가 비슷한 배경음</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {detail.data.similar.map((s) => (
                  <li key={s.id}>
                    <SoundCard
                      sound={s}
                      playing={player.playing === s.id}
                      onToggle={() => player.toggle(s.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      {!sound && !detail.error && detail.data === undefined && (
        <EmptyState icon={AudioLines} title="불러오는 중이에요" />
      )}
    </AppShell>
  );
}
