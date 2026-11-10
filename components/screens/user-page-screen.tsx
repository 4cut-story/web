"use client";

import { BookImage, Check, Link2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { EmptyState, ErrorText } from "@/components/empty-state";
import { FollowButton } from "@/components/follow-button";
import { ComicGrid, PostGrid } from "@/components/story-grid";
import { Button } from "@/components/ui/button";
import { UserShell } from "@/components/user-shell";
import { displayName, profilePath, userPath } from "@/lib/api";
import type { Comic, Post, User } from "@/lib/types";
import { useFollow } from "@/lib/use-follow";
import { usePaged } from "@/lib/use-paged";
import { cn } from "@/lib/utils";

type StoryTab = "all" | "public" | "private";

const TABS: { value: StoryTab; label: string; query: string }[] = [
  { value: "all", label: "전체", query: "" },
  { value: "public", label: "공개", query: "?state=POSTED" },
  { value: "private", label: "비공개", query: "?state=IN_INBOX" },
];

const EMPTY: Record<StoryTab, string> = {
  all: "녹음이 끝나면 4컷이 여기에 모여요.",
  public: "아직 게시한 4컷이 없어요. 4컷을 열어 게시해 보세요.",
  private: "게시하지 않은 4컷이 없어요.",
};

/**
 * 사용자 스토리 (/@아이디). 공유하는 주소다. 다른 사람이 보면 그 사람의 공개 4컷(보는 사람 기준 공개 범위)만,
 * 주인이 보면 내 4컷을 전체·공개(게시함)·비공개(게시 안 함) 탭으로 나눠 본다. 계정 관리는 프로필(/@아이디/profile)에.
 */
export function UserPageScreen({ nickname }: { nickname: string }) {
  return (
    <UserShell
      nickname={nickname}
      title={(user) => displayName(user) ?? nickname}
      selfTab="inbox"
    >
      {(user, self, signedIn) => (
        <div className="flex flex-col gap-6">
          <StoryHeader user={user} self={self} canFollow={signedIn && !self} />
          {self ? <MyStory /> : <PublicStory user={user} />}
        </div>
      )}
    </UserShell>
  );
}

/** 스토리 머리: 아바타, 이름, 아이디, 그리고 주소 복사(주인) 또는 팔로우(다른 사람), 프로필 링크. */
function StoryHeader({
  user,
  self,
  canFollow,
}: {
  user: User;
  self: boolean;
  canFollow: boolean;
}) {
  const follow = useFollow(user.id);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const name = displayName(user) ?? user.nickname;
  const shownError = error ?? follow.error;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + userPath(user.nickname),
      );
      setCopied(true);
    } catch {
      setError("주소를 복사하지 못했어요.");
    }
  }

  return (
    <section
      aria-label="스토리 주인"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} src={user.avatarUrl} size={56} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-base font-semibold">{name}님의 스토리</p>
          <p className="truncate text-sm text-muted-foreground">
            @{user.nickname}
            {follow.stats?.posts !== undefined &&
              ` · 게시물 ${follow.stats.posts}`}
            {follow.stats && ` · 팔로워 ${follow.stats.followers}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:shrink-0 sm:flex-nowrap">
        {self && (
          <Button
            variant="outline"
            onClick={copyAddress}
            className="grow basis-32 sm:grow-0 sm:basis-auto"
          >
            {copied ? (
              <Check aria-hidden className="text-success" />
            ) : (
              <Link2 aria-hidden />
            )}
            {copied ? "복사했어요" : "주소 복사"}
          </Button>
        )}
        {canFollow && follow.stats && (
          <FollowButton
            userId={user.id}
            following={follow.stats.followedByMe}
            onChange={follow.set}
            onError={follow.fail}
            className="grow basis-32 sm:grow-0 sm:basis-auto"
          />
        )}
        <Button
          asChild
          variant="outline"
          className="grow basis-32 sm:grow-0 sm:basis-auto"
        >
          <Link href={profilePath(user.nickname)}>
            <UserRound aria-hidden />
            프로필 보기
          </Link>
        </Button>
      </div>
      {shownError && <ErrorText message={shownError} />}
    </section>
  );
}

/** 내 스토리: 전체·공개·비공개 탭. */
function MyStory() {
  const [tab, setTab] = useState<StoryTab>("all");
  return (
    <>
      <div
        role="group"
        aria-label="공개 범위"
        className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm font-medium sm:max-w-sm"
      >
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "flex h-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              tab === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {/* 탭마다 목록을 새로 불러오도록 key로 나눈다 */}
      <MyComics key={tab} tab={tab} />
    </>
  );
}

function MyComics({ tab }: { tab: StoryTab }) {
  const query = TABS.find((t) => t.value === tab)?.query ?? "";
  const comics = usePaged<Comic>(`/comics${query}`);
  return (
    <>
      {comics.error && (
        <ErrorText message={comics.error.message} code={comics.error.code} />
      )}
      {comics.items?.length === 0 &&
        (tab === "all" ? (
          <EmptyState
            icon={BookImage}
            title="첫 대화를 녹음해 보세요"
            description={EMPTY.all}
            action={
              <Button asChild>
                <Link href="/record">녹음하기</Link>
              </Button>
            }
          />
        ) : (
          <p className="py-10 text-center text-base text-muted-foreground">
            {EMPTY[tab]}
          </p>
        ))}
      <ComicGrid list={comics} badge={tab === "all"} />
    </>
  );
}

/** 다른 사람의 스토리: 보는 사람에게 공개된 4컷만. */
function PublicStory({ user }: { user: User }) {
  const posts = usePaged<Post>(`/posts?authorId=${user.id}`);
  const name = displayName(user) ?? user.nickname;
  return (
    <>
      {posts.error && (
        <ErrorText message={posts.error.message} code={posts.error.code} />
      )}
      {posts.items?.length === 0 && (
        <p className="py-10 text-center text-base text-muted-foreground">
          아직 올린 4컷이 없어요.
        </p>
      )}
      <PostGrid list={posts} name={name} />
    </>
  );
}
