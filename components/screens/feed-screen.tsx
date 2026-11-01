"use client";

import { Newspaper } from "lucide-react";
import Link from "next/link";

import { AppShell, LoginButton } from "@/components/app-shell";
import { EmptyState, ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { PortalGrid } from "@/components/portal-grid";
import { Promo } from "@/components/promo";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/types";
import { usePaged } from "@/lib/use-paged";
import { useViewer } from "@/lib/use-me";
import { useUsers } from "@/lib/use-users";

/**
 * 첫 화면. 로그인하지 않았으면 포털: 서비스 소개와 최근 전체 공개 4컷.
 * 로그인했으면 피드: 내가 팔로우한 사람과 전체 공개 게시물.
 * 둘 다 첫 컷과 제목만 격자로 보여 주고, 누르면 새 탭에서 작성자 페이지를 연다.
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
    >
      {!checking && (
        <>
          {anonymous && <Promo />}
          {anonymous && (feed.items?.length ?? 0) > 0 && (
            <h2 className="pb-4 text-lg font-semibold">방금 올라온 4컷</h2>
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
