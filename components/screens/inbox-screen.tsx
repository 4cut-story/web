"use client";

import { BookImage } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { imageUrl } from "@/lib/api";
import type { Comic } from "@/lib/types";
import { usePaged } from "@/lib/use-paged";

/** 만화함: 만든 만화 2열 격자. 게시한 것은 작은 배지. */
export function InboxScreen() {
  const comics = usePaged<Comic>("/comics");

  return (
    <AppShell title="만화함" tab="inbox">
      {comics.error && (
        <ErrorText message={comics.error.message} code={comics.error.code} />
      )}
      {comics.items?.length === 0 && (
        <EmptyState
          icon={BookImage}
          title="첫 대화를 녹음해 보세요"
          description="녹음이 끝나면 만화가 여기에 모여요."
          action={
            <Button asChild>
              <Link href="/record">녹음하기</Link>
            </Button>
          }
        />
      )}
      <ul className="grid grid-cols-2 gap-3">
        {comics.items?.map((comic) => (
          <li key={comic.id}>
            <Link href={`/comics/${comic.id}`} className="relative block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl("comics", comic.id, true)}
                alt={comic.title ?? "4컷 만화"}
                className="aspect-[2/5] w-full rounded-lg bg-muted object-cover object-top"
              />
              {comic.state === "POSTED" && (
                <span className="absolute top-2 left-2 rounded-sm bg-background px-2 py-0.5 text-xs font-medium">
                  게시됨
                </span>
              )}
              <span className="mt-1 block truncate text-sm">
                {comic.title ?? "제목 없음"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <MoreButton
        hasMore={comics.hasMore}
        onMore={comics.more}
        error={comics.moreError}
      />
    </AppShell>
  );
}
