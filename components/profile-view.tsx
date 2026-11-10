"use client";

import { BookImage } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { ErrorText } from "@/components/empty-state";
import { FollowButton } from "@/components/follow-button";
import { FollowList, type FollowListKind } from "@/components/follow-list";
import { ProductionStatus } from "@/components/production-status";
import { Button } from "@/components/ui/button";
import { displayName, userPath } from "@/lib/api";
import type { FollowStats, User } from "@/lib/types";
import { useFollow } from "@/lib/use-follow";
import { useViewer } from "@/lib/use-me";

const JOINED = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  timeZone: "Asia/Seoul",
});

const CELL = "flex flex-col-reverse gap-0.5 rounded-lg bg-muted px-3 py-2";

/**
 * 게시물, 좋아요, 팔로워, 팔로잉, 그리고 주인이면 만든 4컷과 게시 안 함 숫자 칸.
 * 팔로워·팔로잉 칸을 누르면 그 목록을 연다 (002 FR-018).
 */
function StatLine({
  stats,
  self,
  onOpen,
}: {
  stats: FollowStats;
  self: boolean;
  onOpen: (kind: FollowListKind) => void;
}) {
  const items: [string, number | undefined, FollowListKind?][] = [
    ["게시물", stats.posts],
    ["좋아요", stats.likes],
    ["팔로워", stats.followers, "followers"],
    ["팔로잉", stats.following, "following"],
  ];
  if (self && stats.comics !== undefined) {
    items.push(
      ["만든 4컷", stats.comics],
      ["게시 안 함", Math.max(0, stats.comics - (stats.posts ?? 0))],
    );
  }
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {items
        .filter(([, n]) => n !== undefined)
        .map(([label, n, kind]) =>
          kind ? (
            <div
              key={label}
              className={`${CELL} relative transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-border`}
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{n}</dd>
              {/* 칸 전체를 누를 수 있게 버튼을 위에 덮는다 (dl 안에 dt·dd 순서를 지키려고) */}
              <button
                type="button"
                aria-label={`${label} ${n}명 보기`}
                onClick={() => onOpen(kind)}
                className="absolute inset-0 rounded-lg focus-visible:outline-none"
              />
            </div>
          ) : (
            <div key={label} className={CELL}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{n}</dd>
            </div>
          ),
        )}
    </dl>
  );
}

/**
 * 프로필 본문(/@아이디/profile): 왼쪽(휴대폰은 위) 소개 카드와 오른쪽 숫자 칸, 그리고 children(주인이면 닉네임·계정 관리).
 * 4컷 목록은 스토리(/@아이디)에서 본다.
 */
export function ProfileView({
  user,
  canFollow,
  self = false,
  children,
}: {
  user: User;
  canFollow: boolean;
  self?: boolean;
  children?: React.ReactNode;
}) {
  const follow = useFollow(user.id);
  const viewer = useViewer();
  const [list, setList] = useState<FollowListKind>();
  const name = displayName(user) ?? user.nickname;

  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] md:items-start lg:gap-8">
      <section
        aria-label="프로필"
        className="flex flex-col items-center gap-3 rounded-xl border border-border p-6 text-center md:sticky md:top-20"
      >
        <Avatar name={name} src={user.avatarUrl} size={96} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-xl font-semibold">{name}</p>
          <p className="truncate text-sm text-muted-foreground">
            @{user.nickname}
          </p>
          {user.joinedAt && (
            <p className="text-sm text-muted-foreground">
              {JOINED.format(new Date(user.joinedAt))} 가입
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2">
          {canFollow && follow.stats && (
            <FollowButton
              userId={user.id}
              following={follow.stats.followedByMe}
              onChange={follow.set}
              onError={follow.fail}
            />
          )}
          <Button asChild variant="outline">
            <Link href={userPath(user.nickname)}>
              <BookImage aria-hidden />
              {self ? "내 스토리" : "스토리 보기"}
            </Link>
          </Button>
        </div>
        {follow.error && <ErrorText message={follow.error} />}
      </section>
      <div className="flex min-w-0 flex-col gap-6">
        {follow.stats && (
          <StatLine stats={follow.stats} self={self} onOpen={setList} />
        )}
        {self && <ProductionStatus />}
        {children}
      </div>
      {list && (
        <FollowList
          // 목록에서 팔로우를 바꾸면 닫을 때 숫자를 다시 받는다
          userId={user.id}
          kind={list}
          viewerId={viewer.data?.id ?? null}
          onClose={() => {
            setList(undefined);
            follow.reload();
          }}
        />
      )}
    </div>
  );
}
