"use client";

import { Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Avatar } from "@/components/avatar";
import { ErrorText } from "@/components/empty-state";
import { FollowButton } from "@/components/follow-button";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { displayName, userPath } from "@/lib/api";
import type { FollowEntry } from "@/lib/types";
import { usePaged } from "@/lib/use-paged";
import { useUsers } from "@/lib/use-users";

export type FollowListKind = "followers" | "following";

const TITLE: Record<FollowListKind, string> = {
  followers: "팔로워",
  following: "팔로잉",
};

const EMPTY: Record<FollowListKind, string> = {
  followers: "아직 팔로워가 없어요.",
  following: "아직 팔로우한 사람이 없어요.",
};

/**
 * 팔로워·팔로잉 목록 (002 FR-018). 휴대폰은 아래에서 올라오는 시트, PC는 가운데 창.
 * 줄마다 아바타·이름(그 사람 페이지 링크)과 팔로우 버튼. 나 자신에게는 버튼이 없다.
 */
export function FollowList({
  userId,
  kind,
  viewerId,
  onClose,
}: {
  userId: string;
  kind: FollowListKind;
  /** 보는 사람 ID. 로그인하지 않았으면 null (버튼을 누르면 로그인으로). */
  viewerId: string | null;
  onClose: () => void;
}) {
  const list = usePaged<FollowEntry>(`/follows/${userId}/${kind}`);
  const users = useUsers((list.items ?? []).map((e) => e.userId));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 md:items-center md:px-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLE[kind]}
        className="flex max-h-[80dvh] w-full flex-col rounded-t-xl bg-background md:max-h-[70dvh] md:max-w-md md:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg font-semibold">{TITLE[kind]}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="닫기"
            onClick={onClose}
          >
            <X aria-hidden />
          </Button>
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {list.error && (
            <ErrorText message={list.error.message} code={list.error.code} />
          )}
          {list.items?.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-base text-muted-foreground">
              <Users className="size-8" aria-hidden />
              {EMPTY[kind]}
            </div>
          )}
          <ul className="flex flex-col">
            {list.items?.map((entry) => {
              const user = users[entry.userId];
              const name = displayName(user) ?? "알 수 없음";
              return (
                <li
                  key={entry.userId}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <Link
                    href={
                      user ? userPath(user.nickname) : `/users/${entry.userId}`
                    }
                    onClick={onClose}
                    className="flex min-w-0 items-center gap-3 font-medium"
                  >
                    <Avatar name={name} src={user?.avatarUrl} size={40} />
                    <span className="truncate">{name}</span>
                  </Link>
                  {entry.userId !== viewerId && (
                    <FollowButton
                      userId={entry.userId}
                      following={entry.followedByMe}
                      signedIn={viewerId !== null}
                      size="sm"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <MoreButton
            hasMore={list.hasMore}
            onMore={list.more}
            error={list.moreError}
          />
        </div>
      </div>
    </div>
  );
}
