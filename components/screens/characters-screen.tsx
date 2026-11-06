"use client";

import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CharacterImage } from "@/components/character-image";
import { EmptyState, ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  AGE_GROUPS,
  type CharacterFilter,
  DEFAULT_FILTER,
  filterApiPath,
  filterQuery,
  GENDERS,
  profileLine,
  THEMES,
} from "@/lib/characters";
import type { CharacterCard, JobCount } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { usePaged } from "@/lib/use-paged";
import { cn } from "@/lib/utils";

const SELECT =
  "h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base md:flex-none md:min-w-40";

/**
 * 캐릭터 갤러리(/characters). 등록된 캐릭터를 테마의 기본 표정 그림으로 격자에 둔다.
 * 휴대폰은 2열, 화면이 넓어지면 3·4·6열. 테마·직업·나이대·성별·이름으로 거르고, 조건은 주소에 남긴다.
 */
export function CharactersScreen({ initial }: { initial: CharacterFilter }) {
  const router = useRouter();
  const [filter, setFilter] = useState(initial);
  const [q, setQ] = useState(initial.q);
  const jobs = useLoad("/characters/jobs", () =>
    api.get<JobCount[]>("/characters/jobs"),
  );

  function apply(next: Partial<CharacterFilter>) {
    const merged = { ...filter, ...next };
    setFilter(merged);
    router.replace(`/characters${filterQuery(merged)}`, { scroll: false });
  }

  const filtered =
    filter.job || filter.ageGroup || filter.gender || filter.q.trim();

  return (
    <AppShell title="캐릭터" tab="characters" width="wide">
      <div className="flex flex-col gap-3 pb-4">
        <div
          role="radiogroup"
          aria-label="테마"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={filter.theme === t.value}
              onClick={() => apply({ theme: t.value })}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                filter.theme === t.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              apply({ q });
            }}
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              aria-label="이름으로 찾기"
              placeholder="이름으로 찾기"
              maxLength={30}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-10 text-base"
            />
          </form>
          <div className="flex gap-2">
            <select
              aria-label="직업"
              className={SELECT}
              value={filter.job}
              onChange={(e) => apply({ job: e.target.value })}
            >
              <option value="">모든 직업</option>
              {filter.job && !jobs.data?.some((j) => j.job === filter.job) && (
                <option value={filter.job}>{filter.job}</option>
              )}
              {jobs.data?.map((j) => (
                <option key={j.job} value={j.job}>
                  {j.job} ({j.count})
                </option>
              ))}
            </select>
            <select
              aria-label="나이대"
              className={SELECT}
              value={filter.ageGroup}
              onChange={(e) =>
                apply({
                  ageGroup: e.target.value as CharacterFilter["ageGroup"],
                })
              }
            >
              <option value="">모든 나이</option>
              {AGE_GROUPS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            <select
              aria-label="성별"
              className={SELECT}
              value={filter.gender}
              onChange={(e) =>
                apply({ gender: e.target.value as CharacterFilter["gender"] })
              }
            >
              <option value="">모든 성별</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
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
              apply({ ...DEFAULT_FILTER, theme: filter.theme });
            }}
          >
            조건 지우기
          </Button>
        )}
      </div>
      {/* 조건이 바뀌면 목록을 새로 연다 (더 보기로 붙인 쪽도 버린다) */}
      <CharacterGrid key={filterApiPath(filter)} filter={filter} />
    </AppShell>
  );
}

function CharacterGrid({ filter }: { filter: CharacterFilter }) {
  const list = usePaged<CharacterCard>(filterApiPath(filter));
  const theme = filter.theme === DEFAULT_FILTER.theme ? "" : filter.theme;
  return (
    <>
      {list.error && (
        <ErrorText message={list.error.message} code={list.error.code} />
      )}
      {list.items?.length === 0 && (
        <EmptyState
          icon={Users}
          title="맞는 캐릭터가 없어요"
          description="조건을 바꿔 보세요."
        />
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
        {list.items?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/characters/${c.id}${theme ? `?theme=${theme}` : ""}`}
              className="group block"
            >
              <CharacterImage
                lookId={c.coverLookId}
                alt={c.name}
                className="transition-opacity group-hover:opacity-90"
              />
              <span className="mt-2 block truncate text-sm font-semibold">
                {c.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {profileLine(c)}
              </span>
            </Link>
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
