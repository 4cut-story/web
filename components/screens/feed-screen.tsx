"use client";

import { Newspaper } from "lucide-react";
import Link from "next/link";

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
 */
export function FeedScreen() {
  const viewer = useViewer();
  const anonymous = viewer.data === null;
  // 로그인 확인 전에는 피드인지 포털인지 모르니 헤더만 보인다(깜빡임 방지).
  const checking = viewer.data === undefined && !viewer.error;
  const feed = usePaged<Post>("/feed");
  const users = useUsers((feed.items ?? []).map((p) => p.authorId));

  return (
    <AppShell
      title={anonymous || checking ? "4cut story" : "피드"}
      tab={anonymous || checking ? undefined : "feed"}
      actions={anonymous && <LoginButton />}
      width="wide"
    >
      {!checking && (
        <>
          <Landing signedIn={!anonymous} posts={feed.items ?? []} />
          {(feed.items?.length ?? 0) > 0 && (
            <div id="feed" className="flex scroll-mt-20 flex-col gap-1 pb-6">
              <h2 className="text-2xl font-bold md:text-3xl">
                방금 올라온 4컷
              </h2>
              <p className="text-base text-muted-foreground">
                {anonymous
                  ? "누구나 볼 수 있게 올라온 최신 4컷이에요."
                  : "내가 팔로우한 사람과 전체 공개 4컷이에요."}
              </p>
            </div>
          )}
          {feed.error && (
            <ErrorText message={feed.error.message} code={feed.error.code} />
          )}
          {feed.items?.length === 0 && (
            <EmptyState
              icon={Newspaper}
              title="아직 올라온 4컷이 없어요"
              description="대화를 녹음해 첫 4컷을 만들어 보세요."
              action={
                <Button asChild>
                  <Link href={anonymous ? "/login" : "/record"}>녹음하기</Link>
                </Button>
              }
            />
          )}
          <PortalGrid posts={feed.items ?? []} users={users} />
          <MoreButton
            hasMore={feed.hasMore}
            onMore={feed.more}
            error={feed.moreError}
          />
        </>
      )}
    </AppShell>
  );
}
