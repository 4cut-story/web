"use client";

import { Newspaper } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/types";
import { usePaged } from "@/lib/use-paged";
import { useUsers } from "@/lib/use-users";

/** 피드: 내가 팔로우한 사람과 전체 공개 게시물. */
export function FeedScreen() {
  const feed = usePaged<Post>("/feed");
  const users = useUsers((feed.items ?? []).map((p) => p.authorId));

  return (
    <AppShell title="피드" tab="feed">
      {feed.error && (
        <ErrorText message={feed.error.message} code={feed.error.code} />
      )}
      {feed.items?.length === 0 && (
        <EmptyState
          icon={Newspaper}
          title="아직 올라온 만화가 없어요"
          description="대화를 녹음해 첫 만화를 만들어 보세요."
          action={
            <Button asChild>
              <Link href="/record">녹음하기</Link>
            </Button>
          }
        />
      )}
      <div className="flex flex-col gap-7">
        {feed.items?.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            author={users[post.authorId]}
          />
        ))}
      </div>
      <MoreButton
        hasMore={feed.hasMore}
        onMore={feed.more}
        error={feed.moreError}
      />
    </AppShell>
  );
}
