"use client";

import Link from "next/link";

import { ComicCover } from "@/components/comic-cover";
import { MoreButton } from "@/components/more-button";
import { imageUrl } from "@/lib/api";
import type { Comic, Post } from "@/lib/types";

type Paged<T> = {
  items?: T[];
  hasMore: boolean;
  more: () => void;
  moreError?: string;
};

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4";

/** 내 4컷 격자(첫 컷과 제목). 누르면 만화 상세. badge면 게시한 것에 "게시됨"을 단다. */
export function ComicGrid({
  list,
  badge,
}: {
  list: Paged<Comic>;
  badge: boolean;
}) {
  return (
    <>
      <ul className={GRID}>
        {list.items?.map((comic) => (
          <li key={comic.id}>
            <Link href={`/comics/${comic.id}`} className="group relative block">
              <ComicCover
                src={imageUrl("comics", comic.id, true)}
                alt={comic.title ?? "4컷"}
              />
              {badge && comic.state === "POSTED" && (
                <span className="absolute top-2 left-2 rounded-sm bg-background px-2 py-0.5 text-xs font-medium">
                  게시됨
                </span>
              )}
              <span className="mt-2 block truncate text-sm font-medium">
                {comic.title ?? "제목 없음"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <MoreButton
        hasMore={list.hasMore}
        onMore={list.more}
        error={list.moreError}
      />
    </>
  );
}

/** 다른 사람의 공개 4컷 격자. 누르면 게시물 상세. */
export function PostGrid({ list, name }: { list: Paged<Post>; name: string }) {
  return (
    <>
      <ul className={GRID}>
        {list.items?.map((p) => (
          <li key={p.postId}>
            <Link href={`/posts/${p.postId}`} className="group block">
              <ComicCover
                src={imageUrl("posts", p.postId, true)}
                alt={p.caption || p.title || `${name}님의 4컷`}
              />
              <span className="mt-2 block truncate text-sm font-medium">
                {p.title ?? "제목 없음"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <MoreButton
        hasMore={list.hasMore}
        onMore={list.more}
        error={list.moreError}
      />
    </>
  );
}
