"use client";

import {
  CircleAlert,
  CircleCheck,
  FileAudio,
  LoaderCircle,
  Mic,
  Newspaper,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { POLL_MS } from "@/components/screens/progress-screen";
import { api, errorMessage } from "@/lib/api";
import {
  countGroups,
  itemTitle,
  sourceLabel,
  statusGroup,
  statusHref,
  statusLabel,
  type StatusGroup,
} from "@/lib/conversation-status";
import { timeAgo } from "@/lib/format";
import type { Conversation, Page } from "@/lib/types";
import { useComicTitles } from "@/lib/use-comic-titles";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

/** 한 번에 불러오는 수 (서버 최대). */
export const STATUS_PAGE_SIZE = 50;
const PATH = `/conversations?size=${STATUS_PAGE_SIZE}`;

type Filter = StatusGroup | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "진행 중" },
  { value: "done", label: "완료" },
  { value: "failed", label: "못 만듦" },
  { value: "all", label: "전체" },
];

const SOURCE_ICONS = {
  RECORDING: Mic,
  UPLOAD: FileAudio,
  ARTICLE: Newspaper,
} as const;

function GroupIcon({ group }: { group: StatusGroup }) {
  if (group === "done") {
    return <CircleCheck aria-hidden className="size-4 text-success" />;
  }
  if (group === "failed") {
    return <CircleAlert aria-hidden className="size-4 text-destructive" />;
  }
  return (
    <LoaderCircle
      aria-hidden
      className="size-4 animate-spin motion-reduce:animate-none"
    />
  );
}

function Row({ c, comicTitle }: { c: Conversation; comicTitle?: string }) {
  const group = statusGroup(c);
  const Icon = SOURCE_ICONS[c.source] ?? Mic;
  const { text: title, placeholder } = itemTitle(c, comicTitle);
  return (
    <li>
      <Link
        href={statusHref(c)}
        className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span
          className={cn(
            "truncate text-sm font-medium",
            placeholder && "font-normal text-muted-foreground",
          )}
        >
          {title}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            <Icon aria-hidden className="size-3" />
            {sourceLabel(c)}
          </span>
          <span className="shrink-0">{timeAgo(c.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <GroupIcon group={group} />
          <span
            className={cn(
              group === "failed" && "text-destructive",
              group === "active" && "text-foreground",
              group === "done" && "text-muted-foreground",
            )}
          >
            {statusLabel(c)}
          </span>
          {group === "active" && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {c.progress}%
            </span>
          )}
        </div>
        {group === "active" && (
          <div
            role="progressbar"
            aria-label={`${title} 진행률`}
            aria-valuenow={c.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary"
              style={{ width: `${c.progress}%` }}
            />
          </div>
        )}
      </Link>
    </li>
  );
}

/**
 * 내 프로필의 '만드는 현황': 내가 등록한 녹음·기사(RSS 포함)가 지금 어느 단계인지.
 * 진행 중인 것이 있으면 5초마다 다시 확인한다. 나에게만 보인다.
 */
export function ProductionStatus() {
  const first = useLoad(PATH, () => api.get<Page<Conversation>>(PATH));
  const [extra, setExtra] = useState<Conversation[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [moreError, setMoreError] = useState<string>();
  const [picked, setPicked] = useState<Filter>();

  const head = first.data?.items ?? [];
  const seen = new Set(head.map((c) => c.id));
  const items = [...head, ...extra.filter((c) => !seen.has(c.id))];
  const counts = countGroups(items);
  const titles = useComicTitles(
    items.flatMap((c) => (c.status === "DONE" && c.comicId ? [c.comicId] : [])),
  );
  const anyActive = head.some((c) => statusGroup(c) === "active");
  const next = cursor === undefined ? first.data?.nextCursor : cursor;
  const filter: Filter = picked ?? (counts.active > 0 ? "active" : "all");
  const shown =
    filter === "all" ? items : items.filter((c) => statusGroup(c) === filter);
  const { reload } = first;

  useEffect(() => {
    if (!anyActive) {
      return;
    }
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
    // reload는 매번 새 함수지만 같은 일을 한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyActive]);

  async function more() {
    if (!next) {
      return;
    }
    try {
      const page = await api.get<Page<Conversation>>(
        `${PATH}&cursor=${encodeURIComponent(next)}`,
      );
      setExtra((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
      setMoreError(undefined);
    } catch (e) {
      setMoreError(errorMessage(e));
    }
  }

  const total: Record<Filter, number> = { ...counts, all: items.length };

  return (
    <section
      aria-labelledby="production-status"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="production-status" className="text-base font-semibold">
          만드는 현황
        </h2>
        <p className="text-xs text-muted-foreground">
          {next
            ? `최근 ${items.length}개 기준 · 나에게만 보여요`
            : "나에게만 보여요"}
        </p>
      </div>
      {first.error && (
        <ErrorText message={first.error.message} code={first.error.code} />
      )}
      {first.data && items.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          아직 등록한 녹음이나 기사가 없어요.
        </p>
      )}
      {items.length > 0 && (
        <>
          <div
            role="group"
            aria-label="현황 고르기"
            className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 text-sm font-medium"
          >
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setPicked(value)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-10 md:flex-row md:gap-1.5",
                  filter === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="text-xs md:text-sm">{label}</span>
                <span className="text-base font-semibold tabular-nums md:text-sm">
                  {total[value]}
                </span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {filter === "active"
                ? "지금 만드는 4컷이 없어요."
                : "해당하는 4컷이 없어요."}
            </p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {shown.map((c) => (
                <Row
                  key={c.id}
                  c={c}
                  comicTitle={c.comicId ? titles[c.comicId] : undefined}
                />
              ))}
            </ul>
          )}
          <MoreButton hasMore={Boolean(next)} onMore={more} error={moreError} />
        </>
      )}
    </section>
  );
}
