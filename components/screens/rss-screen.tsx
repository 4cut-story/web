"use client";

import { Pause, Play, RefreshCw, Rss, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ChoicePicker } from "@/components/choice-picker";
import { ConceptPicker } from "@/components/concept-picker";
import { DialectPicker } from "@/components/dialect-picker";
import { ErrorText } from "@/components/empty-state";
import { looksLikeUrl } from "@/components/screens/article-screen";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import type {
  Concept,
  Dialect,
  RssFeed,
  RssFeedItem,
  RssItemStatus,
} from "@/lib/types";
import { useLoad } from "@/lib/use-load";

type Publish = "REVIEW" | "AUTO";

const PUBLISH: { value: Publish; label: string }[] = [
  { value: "REVIEW", label: "확인 후 공개" },
  { value: "AUTO", label: "바로 공개" },
];

const STATUS: Record<RssItemStatus, string> = {
  MADE: "만듦",
  SKIPPED: "건너뜀",
  SIMILAR: "비슷해서 건너뜀",
  FAILED: "만들지 못함",
};

const CHECKED = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

/**
 * RSS 구독: 피드 주소를 등록해 두면 서버가 30분마다 새 기사를 확인해 4컷으로 만든다. 등록할 때 바로 공개(전체 공개 게시)와
 * 확인 후 공개(만화함에 둠)를 고른다. 최근 3일 안에 만든 기사와 주제가 비슷한 기사는 건너뛴다.
 */
export function RssScreen() {
  const feeds = useLoad("rss-feeds", () =>
    api.get<{ items: RssFeed[] }>("/rss-feeds"),
  );
  const [url, setUrl] = useState("");
  const [publish, setPublish] = useState<Publish>("REVIEW");
  const [concept, setConcept] = useState<Concept>("AUTO");
  const [dialect, setDialect] = useState<Dialect>("NONE");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const items = feeds.data?.items ?? [];

  function replace(feed: RssFeed) {
    feeds.setData({ items: items.map((f) => (f.id === feed.id ? feed : f)) });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!looksLikeUrl(url)) {
      setError("http나 https로 시작하는 RSS 주소를 넣어 주세요.");
      return;
    }
    setSending(true);
    try {
      const feed = await api.post<RssFeed>("/rss-feeds", {
        url: url.trim(),
        autoPublish: publish === "AUTO",
        concept,
        dialect,
      });
      feeds.setData({ items: [feed, ...items] });
      setUrl("");
    } catch (e) {
      setError(errorMessage(e));
    }
    setSending(false);
  }

  return (
    <AppShell title="RSS 구독" tab="profile" width="wide">
      {/* 프로필과 같은 넓은 틀: 휴대폰은 한 줄, 넓은 화면은 왼쪽 등록·오른쪽 구독 목록 */}
      <div className="grid gap-8 pb-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <form
          onSubmit={submit}
          className="flex flex-col gap-6 md:sticky md:top-20 md:self-start"
        >
          <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:text-left">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
              <Rss aria-hidden className="size-7" />
            </span>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
              뉴스 사이트의 RSS 주소를 등록해 두면, 새 기사가 올라올 때마다 AI가
              4컷으로 만들어요.
            </p>
          </div>
          <label className="flex w-full flex-col gap-2 text-base font-medium">
            RSS 주소
            <input
              type="url"
              inputMode="url"
              name="url"
              required
              placeholder="https://news.example.com/rss"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={sending}
              className="h-12 w-full rounded-lg border border-border bg-background px-4 text-base font-normal"
            />
          </label>
          <ChoicePicker
            label="만들어지면"
            options={PUBLISH}
            value={publish}
            onChange={setPublish}
          />
          <ConceptPicker value={concept} onChange={setConcept} />
          <DialectPicker value={dialect} onChange={setDialect} />
          <ul className="flex w-full flex-col gap-1 text-sm text-muted-foreground">
            <li>
              • 30분마다 새 기사를 확인해 최신 기사부터 한 번에 3편, 구독마다
              하루 10편까지 만들어요. 하루 10편은 하루 동안 고르게 나눠
              만들어요.
            </li>
            <li>• 처음 등록하면 가장 최근 기사 1편만 만들어요.</li>
            <li>• 최근 3일 안에 만든 기사와 주제가 비슷하면 건너뛰어요.</li>
            <li>
              • 칼럼·사설·인터뷰, 사진·영상 위주 기사, 유료 기사는 건너뛰어요.
            </li>
            <li>
              • 기사에서는 사실만 가져와 새 이야기로 각색하고, 맨 아래에 출처를
              남겨요.
            </li>
            <li>
              • 확인 후 공개면 만화함에 두고, 바로 공개면 전체 공개로 올려요.
            </li>
          </ul>
          <Button size="lg" type="submit" disabled={sending}>
            <Rss aria-hidden />
            {sending ? "피드를 읽는 중이에요…" : "구독하기"}
          </Button>
          {error && <ErrorText message={error} />}
        </form>

        <section className="flex flex-col gap-4" aria-label="구독 목록">
          <h2 className="text-lg font-semibold">구독 중인 피드</h2>
          {feeds.error && (
            <ErrorText message={feeds.error.message} code={feeds.error.code} />
          )}
          {feeds.data && items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              아직 구독한 피드가 없어요.
            </p>
          )}
          {items.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              onChange={replace}
              onRemoved={() =>
                feeds.setData({ items: items.filter((f) => f.id !== feed.id) })
              }
            />
          ))}
        </section>
      </div>
    </AppShell>
  );
}

function FeedCard({
  feed,
  onChange,
  onRemoved,
}: {
  feed: RssFeed;
  onChange: (feed: RssFeed) => void;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [checking, setChecking] = useState(false);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await work();
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  const update = (change: Partial<Pick<RssFeed, "autoPublish" | "enabled">>) =>
    run(async () => {
      onChange(
        await api.put<RssFeed>(`/rss-feeds/${feed.id}`, {
          autoPublish: feed.autoPublish,
          enabled: feed.enabled,
          concept: feed.concept,
          dialect: feed.dialect,
          ...change,
        }),
      );
    });

  const check = () =>
    run(async () => {
      onChange(await api.post<RssFeed>(`/rss-feeds/${feed.id}/check`));
      setChecking(true);
    });

  const remove = () =>
    run(async () => {
      await api.del(`/rss-feeds/${feed.id}`);
      onRemoved();
    });

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold break-words">{feed.title}</h3>
        <p className="text-xs break-all text-muted-foreground">{feed.url}</p>
        <p className="text-sm text-muted-foreground">
          {feed.autoPublish ? "바로 공개" : "확인 후 공개"} · 만든 4컷{" "}
          {feed.made}개 ·{" "}
          {feed.enabled
            ? feed.lastCheckedAt
              ? `${CHECKED.format(new Date(feed.lastCheckedAt))} 확인`
              : "곧 확인해요"
            : "꺼 둠"}
        </p>
        {feed.lastError && (
          <p className="text-sm text-destructive">{feed.lastError}</p>
        )}
        {checking && (
          <p className="text-sm text-muted-foreground">
            지금 확인하고 있어요. 새 기사가 있으면 곧 만들기 시작해요.
          </p>
        )}
      </div>
      {feed.recent.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {feed.recent.map((item) => (
            <RecentItem key={`${item.link}-${item.createdAt}`} item={item} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => update({ autoPublish: !feed.autoPublish })}
        >
          {feed.autoPublish ? "확인 후 공개로 바꾸기" : "바로 공개로 바꾸기"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => update({ enabled: !feed.enabled })}
        >
          {feed.enabled ? <Pause aria-hidden /> : <Play aria-hidden />}
          {feed.enabled ? "끄기" : "켜기"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || !feed.enabled}
          onClick={check}
        >
          <RefreshCw aria-hidden />
          지금 확인
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={remove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 aria-hidden />
          지우기
        </Button>
      </div>
      {error && <ErrorText message={error} />}
    </article>
  );
}

function RecentItem({ item }: { item: RssFeedItem }) {
  const title = item.title ?? item.link;
  return (
    <li className="flex flex-col gap-0.5">
      <span className="break-words">
        {item.conversationId ? (
          <Link
            href={`/conversations/${item.conversationId}`}
            className="underline underline-offset-2"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        {STATUS[item.status]}
        {item.reason && item.status !== "MADE" ? ` · ${item.reason}` : ""}
      </span>
    </li>
  );
}
