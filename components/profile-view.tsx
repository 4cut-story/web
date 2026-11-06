"use client";

import { BookImage, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Avatar } from "@/components/avatar";
import { ComicCover } from "@/components/comic-cover";
import { ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { api, errorMessage, imageUrl } from "@/lib/api";
import type { FollowStats, Post, User } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { usePaged } from "@/lib/use-paged";

const JOINED = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  timeZone: "Asia/Seoul",
});

/** 게시물, 좋아요, 팔로워, 팔로잉 숫자. */
function StatLine({ stats }: { stats: FollowStats }) {
  const items: [string, number | undefined][] = [
    ["게시물", stats.posts],
    ["좋아요", stats.likes],
    ["팔로워", stats.followers],
    ["팔로잉", stats.following],
  ];
  return (
    <dl className="grid grid-cols-4 gap-2 py-1 text-sm text-muted-foreground md:flex md:flex-wrap md:gap-x-4 md:gap-y-1 md:py-0">
      {items
        .filter(([, n]) => n !== undefined)
        .map(([label, n]) => (
          // 휴대폰은 숫자를 위에 크게, PC는 "게시물 11"처럼 한 줄로
          <div
            key={label}
            className="flex flex-col-reverse md:flex-row md:items-baseline md:gap-1"
          >
            <dt className="text-xs md:text-sm">{label}</dt>
            <dd className="text-base font-semibold text-foreground tabular-nums md:text-sm">
              {n}
            </dd>
          </div>
        ))}
    </dl>
  );
}

/** 가입일, 그리고 내 프로필이면 만든 4컷 수와 게시 안 한 수. */
function ProfileNote({
  joinedAt,
  stats,
}: {
  joinedAt?: string;
  stats?: FollowStats;
}) {
  const parts: string[] = [];
  if (joinedAt) {
    parts.push(`${JOINED.format(new Date(joinedAt))} 가입`);
  }
  if (stats?.comics !== undefined) {
    const unpublished = Math.max(0, stats.comics - (stats.posts ?? 0));
    parts.push(`만든 4컷 ${stats.comics}개`, `게시 안 함 ${unpublished}개`);
  }
  if (parts.length === 0) {
    return null;
  }
  // 줄이 바뀔 때 "게시 안 함 1개" 같은 묶음이 쪼개지지 않게 묶음마다 줄바꿈을 막는다
  return (
    <p className="text-sm text-muted-foreground">
      {parts.map((part, i) => (
        <Fragment key={part}>
          {i > 0 && " · "}
          <span className="whitespace-nowrap">{part}</span>
        </Fragment>
      ))}
    </p>
  );
}

/**
 * 프로필 본문: 프로필 카드(아바타, 닉네임, 팔로워/팔로잉, 팔로우 버튼 또는 actions)와 '게시한 4컷' 격자.
 * 게시하지 않은 4컷까지 모두 보는 곳은 스토리 탭이고, 여기는 다른 사람에게 보이는 공개 페이지다.
 * 게시물은 보는 사람 기준 공개 범위대로 온다 (로그인하지 않았으면 전체 공개만, 주인은 모두).
 */
export function ProfileView({
  userId,
  canFollow,
  self = false,
  actions,
}: {
  userId: string;
  canFollow: boolean;
  /** 내 페이지면 빈 목록에서 스토리로 안내한다. */
  self?: boolean;
  /** 프로필 카드 오른쪽(휴대폰은 아래)에 둘 버튼. */
  actions?: React.ReactNode;
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
      <section
        aria-label="프로필"
        className="flex flex-col gap-4 rounded-xl border border-border p-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={name || "?"} src={user.data?.avatarUrl} size={72} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-lg font-semibold">{name}</p>
            {stats.data && <StatLine stats={stats.data} />}
            <ProfileNote
              joinedAt={user.data?.joinedAt}
              stats={self ? stats.data : undefined}
            />
          </div>
        </div>
        {((canFollow && stats.data) || actions) && (
          <div className="flex gap-2 md:shrink-0">
            {canFollow && stats.data && (
              <Button
                variant={stats.data.followedByMe ? "secondary" : "default"}
                onClick={toggleFollow}
                className="flex-1 md:w-40 md:flex-none"
              >
                {stats.data.followedByMe ? (
                  <UserCheck aria-hidden />
                ) : (
                  <UserPlus aria-hidden />
                )}
                {stats.data.followedByMe ? "팔로우 중" : "팔로우"}
              </Button>
            )}
            {actions}
          </div>
        )}
      </section>
      {error && <ErrorText message={error} />}
      <h2 className="-mb-2 text-base font-semibold">게시한 4컷</h2>
      {posts.items?.length === 0 &&
        (self ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-base text-muted-foreground">
              아직 게시한 4컷이 없어요. 스토리에서 4컷을 골라 올려 보세요.
            </p>
            <Button asChild variant="secondary">
              <Link href="/comics">
                <BookImage aria-hidden />
                스토리로 가기
              </Link>
            </Button>
          </div>
        ) : (
          <p className="py-8 text-center text-base text-muted-foreground">
            아직 올린 4컷이 없어요.
          </p>
        ))}
      <ul className="grid grid-cols-3 gap-1 md:grid-cols-4 md:gap-2 lg:grid-cols-5">
        {posts.items?.map((p) => (
          <li key={p.postId}>
            <Link href={`/posts/${p.postId}`} className="group block">
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
