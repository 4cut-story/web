"use client";

import { AudioLines } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { SearchBox } from "@/components/search-box";
import { SoundCard, useSoundPlayer } from "@/components/sound-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  DEFAULT_SOUND_FILTER,
  SOUND_KINDS,
  type SoundFilter,
  categoryLabel,
  moodLabel,
  soundApiPath,
  soundFilterQuery,
} from "@/lib/sounds";
import type { Sound, SoundFacets } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { usePaged } from "@/lib/use-paged";
import { cn } from "@/lib/utils";

const SELECT =
  "h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base md:flex-none md:min-w-48";

/**
 * 배경음 라이브러리(/sounds). 장소·환경음, 효과음, 배경음악을 종류·카테고리·분위기로 거르고, 장면을 글로 적어 찾는다
 * (설명 임베딩이 가까운 순). 카드에서 바로 들어 보고, 저작자 표시를 함께 보여 준다. 조건은 주소에 남긴다.
 */
export function SoundsScreen({ initial }: { initial: SoundFilter }) {
  const router = useRouter();
  const [filter, setFilter] = useState(initial);
  const [q, setQ] = useState(initial.q);
  const facets = useLoad("/sounds/facets", () =>
    api.get<SoundFacets>("/sounds/facets"),
  );

  function apply(next: Partial<SoundFilter>) {
    const merged = { ...filter, ...next };
    setFilter(merged);
    router.replace(`/sounds${soundFilterQuery(merged)}`, { scroll: false });
  }

  const categories = (facets.data?.categories ?? []).filter(
    (c) => !filter.kind || c.kind === filter.kind,
  );
  const filtered = filter.category || filter.mood || filter.q.trim();
  const kinds = [{ value: "" as const, label: "전체" }, ...SOUND_KINDS];

  return (
    <AppShell
      title="배경음"
      back={{ href: "/", label: "처음으로" }}
      width="wide"
    >
      <div className="flex flex-col gap-3 pb-4">
        <p className="text-sm text-muted-foreground">
          만화 장면에 어울리는 장소 소리, 효과음, 배경음악이에요. 모두
          상업적으로 쓸 수 있는 CC0·CC BY 소리이고, 카드마다 저작자를
          표시했어요.
        </p>
        <div
          role="radiogroup"
          aria-label="종류"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {kinds.map((k) => (
            <button
              key={k.value || "ALL"}
              type="button"
              role="radio"
              aria-checked={filter.kind === k.value}
              onClick={() => apply({ kind: k.value, category: "" })}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                filter.kind === k.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <SearchBox
            label="장면이나 소리로 찾기"
            placeholder="장면이나 소리로 찾기 (예: 비 오는 밤 바닷가)"
            maxLength={50}
            value={q}
            onChange={setQ}
            onSubmit={() => apply({ q })}
          />
          <div className="flex gap-2">
            <select
              aria-label="카테고리"
              className={SELECT}
              value={filter.category}
              onChange={(e) => apply({ category: e.target.value })}
            >
              <option value="">모든 카테고리</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {categoryLabel(c.category)} ({c.count})
                </option>
              ))}
            </select>
            <select
              aria-label="분위기"
              className={SELECT}
              value={filter.mood}
              onChange={(e) => apply({ mood: e.target.value })}
            >
              <option value="">모든 분위기</option>
              {facets.data?.moods.map((m) => (
                <option key={m.mood} value={m.mood}>
                  {moodLabel(m.mood)} ({m.count})
                </option>
              ))}
            </select>
          </div>
        </div>
        {filtered && (
          <Button
            variant="link"
            size="sm"
            className="self-start px-0"
            onClick={() => {
              setQ("");
              apply({ ...DEFAULT_SOUND_FILTER, kind: filter.kind });
            }}
          >
            조건 지우기
          </Button>
        )}
      </div>
      <SoundGrid key={soundApiPath(filter)} filter={filter} />
    </AppShell>
  );
}

function SoundGrid({ filter }: { filter: SoundFilter }) {
  const list = usePaged<Sound>(soundApiPath(filter));
  const player = useSoundPlayer();
  return (
    <>
      {list.error && (
        <ErrorText message={list.error.message} code={list.error.code} />
      )}
      {list.items?.length === 0 && (
        <EmptyState
          icon={AudioLines}
          title="맞는 배경음이 없어요"
          description="조건을 바꿔 보세요."
        />
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {list.items?.map((s) => (
          <li key={s.id}>
            <SoundCard
              sound={s}
              playing={player.playing === s.id}
              onToggle={() => player.toggle(s.id)}
            />
          </li>
        ))}
      </ul>
      <MoreButton
        hasMore={list.hasMore}
        onMore={list.more}
        error={list.moreError}
      />
    </>
  );
}
