"use client";

import { Newspaper, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppShell, LoginButton } from "@/components/app-shell";
import { EmptyState, ErrorText } from "@/components/empty-state";
import { Landing } from "@/components/landing";
import { MoreButton } from "@/components/more-button";
import { PortalGrid } from "@/components/portal-grid";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/types";
import { usePaged } from "@/lib/use-paged";
import { useViewer } from "@/lib/use-me";
import { useUsers } from "@/lib/use-users";

/**
 * 첫 화면. 위에 서비스 소개(랜딩), 그 아래 피드가 이어진다.
 * 로그인하지 않았으면 최근 전체 공개 4컷, 로그인했으면 내가 팔로우한 사람과 전체 공개 게시물.
 * 둘 다 첫 컷과 제목만 격자로 보여 주고, 누르면 같은 창에서 게시물 상세(4컷 전체)를 연다.
 * 로그인했으면 "전체"/"팔로잉" 탭으로 내가 팔로우한 사람의 4컷만 따로 볼 수 있다 (002 FR-019).
 */
export function FeedScreen() {
  const viewer = useViewer();
  const anonymous = viewer.data === null;
  // 로그인 확인 전에는 피드인지 포털인지 모르니 헤더만 보인다(깜빡임 방지).
  const checking = viewer.data === undefined && !viewer.error;
  const feed = usePaged<Post>("/feed");
  const [scope, setScope] = useState<FeedScope>("all");
  const following = !anonymous && scope === "following";

  return (
    <AppShell
      title={anonymous || checking ? "4cut story" : "피드"}
      brand={anonymous || checking}
      tab={checking ? undefined : "feed"}
      actions={anonymous && <LoginButton />}
      width="wide"
    >
      {!checking && (
        <>
          <Landing signedIn={!anonymous} posts={feed.items ?? []} />
          {((feed.items?.length ?? 0) > 0 || !anonymous) && (
            <div
              id="feed"
              className="flex scroll-mt-20 flex-col gap-3 pb-6 md:flex-row md:items-end md:justify-between"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold md:text-3xl">
                  {following ? "팔로우한 사람의 4컷" : "방금 올라온 4컷"}
                </h2>
                <p className="text-base text-muted-foreground">
                  {anonymous
                    ? "누구나 볼 수 있게 올라온 최신 4컷이에요."
                    : following
                      ? "내가 팔로우한 사람이 올린 4컷만 모았어요."
                      : "내가 팔로우한 사람과 전체 공개 4컷이에요."}
                </p>
              </div>
              {!anonymous && <ScopeTabs scope={scope} onChange={setScope} />}
            </div>
          )}
          {following ? (
            <FollowingFeed onShowAll={() => setScope("all")} />
          ) : (
            <FeedList
              feed={feed}
              empty={
                <EmptyState
                  icon={Newspaper}
                  title="아직 올라온 4컷이 없어요"
                  description="대화를 녹음해 첫 4컷을 만들어 보세요."
                  action={
                    <Button asChild>
                      <Link href={anonymous ? "/login" : "/record"}>
                        녹음하기
                      </Link>
                    </Button>
                  }
                />
              }
            />
          )}
        </>
      )}
    </AppShell>
  );
}

type FeedScope = "all" | "following";

const SCOPES: { value: FeedScope; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "following", label: "팔로잉" },
];

/** 피드 "전체"/"팔로잉" 탭. 휴대폰은 한 줄을 다 쓰고, PC는 제목 오른쪽에 작게 둔다. */
function ScopeTabs({
  scope,
  onChange,
}: {
  scope: FeedScope;
  onChange: (scope: FeedScope) => void;
}) {
  return (
    <div
      role="group"
      aria-label="피드 범위"
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium md:w-56 md:shrink-0"
    >
      {SCOPES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={scope === value}
          onClick={() => onChange(value)}
          className={
            scope === value
              ? "h-10 rounded-md bg-background text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              : "h-10 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** 내가 팔로우한 사람의 4컷만. 탭을 처음 열 때 불러온다. */
function FollowingFeed({ onShowAll }: { onShowAll: () => void }) {
  const feed = usePaged<Post>("/feed?scope=following");
  return (
    <FeedList
      feed={feed}
      empty={
        <EmptyState
          icon={UserPlus}
          title="팔로우한 사람의 4컷이 아직 없어요"
          description="만화를 보다가 작성자 이름 옆의 팔로우를 누르면 그 사람의 4컷이 여기에 모여요."
          action={
            <Button variant="secondary" onClick={onShowAll}>
              전체 4컷 보기
            </Button>
          }
        />
      }
    />
  );
}

/** 피드 격자: 오류, 비었을 때 안내, 첫 컷 격자, 더 보기. */
function FeedList({
  feed,
  empty,
}: {
  feed: ReturnType<typeof usePaged<Post>>;
  empty: React.ReactNode;
}) {
  const users = useUsers((feed.items ?? []).map((p) => p.authorId));
  return (
    <>
      {feed.error && (
        <ErrorText message={feed.error.message} code={feed.error.code} />
      )}
      {feed.items?.length === 0 && empty}
      <PortalGrid posts={feed.items ?? []} users={users} />
      <MoreButton
        hasMore={feed.hasMore}
        onMore={feed.more}
        error={feed.moreError}
      />
    </>
  );
}
