"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { ComicCover } from "@/components/comic-cover";
import { ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { api, errorMessage, imageUrl } from "@/lib/api";
import type { FollowStats, Post, User } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { usePaged } from "@/lib/use-paged";

/**
 * 프로필 본문: 아바타 72px, 닉네임, 팔로워/팔로잉, 팔로우 버튼(로그인한 사람이 남의 페이지를 볼 때), 게시물 3열 격자.
 * 게시물은 보는 사람 기준 공개 범위대로 온다 (로그인하지 않았으면 전체 공개만, 주인은 모두).
 */
export function ProfileView({
  userId,
  canFollow,
}: {
  userId: string;
  canFollow: boolean;
}) {
  const user = useLoad(`user:${userId}`, () =>
    api.get<User>(`/users/${userId}`),
  );
  const stats = useLoad(`stats:${userId}`, () =>
    api.get<FollowStats>(`/follows/${userId}/stats`),
  );
  const posts = usePaged<Post>(`/posts?authorId=${userId}`);
  const [error, setError] = useState<string>();
  const name = user.data?.nickname ?? "";

  async function toggleFollow() {
    const s = stats.data;
    if (!s) {
      return;
    }
    try {
      await (s.followedByMe
        ? api.del(`/follows/${userId}`)
        : api.put(`/follows/${userId}`));
      stats.setData({
        ...s,
        followedByMe: !s.followedByMe,
        followers: s.followers + (s.followedByMe ? -1 : 1),
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {user.error && (
        <ErrorText message={user.error.message} code={user.error.code} />
      )}
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} src={user.data?.avatarUrl} size={72} />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-lg font-semibold">{name}</p>
          {stats.data && (
            <p className="text-sm text-muted-foreground">
              팔로워{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {stats.data.followers}
              </span>
              {" · "}팔로잉{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {stats.data.following}
              </span>
            </p>
          )}
        </div>
      </div>
      {canFollow && stats.data && (
        <Button
          variant={stats.data.followedByMe ? "secondary" : "default"}
          onClick={toggleFollow}
        >
          {stats.data.followedByMe ? "팔로우 중" : "팔로우"}
        </Button>
      )}
      {error && <ErrorText message={error} />}
      {posts.items?.length === 0 && (
        <p className="py-8 text-center text-base text-muted-foreground">
          아직 올린 4컷이 없어요.
        </p>
      )}
      <ul className="grid grid-cols-3 gap-1">
        {posts.items?.map((p) => (
          <li key={p.postId}>
            <Link href={`/posts/${p.postId}`}>
              <ComicCover
                src={imageUrl("posts", p.postId, true)}
                alt={p.caption || `${name}님의 4컷`}
                className="rounded-sm"
              />
            </Link>
          </li>
        ))}
      </ul>
      <MoreButton
        hasMore={posts.hasMore}
        onMore={posts.more}
        error={posts.moreError}
      />
    </div>
  );
}
