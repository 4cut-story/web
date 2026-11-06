"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PortalGrid } from "@/components/portal-grid";
import type { Post } from "@/lib/types";
import { usePaged } from "@/lib/use-paged";
import { useUsers } from "@/lib/use-users";

/** 소개 페이지의 실제 예시: 최근 공개된 4컷 네 개. 불러오지 못하면 피드로 가는 길만 둔다. */
export function AboutExamples() {
  const feed = usePaged<Post>("/feed");
  const posts = (feed.items ?? []).slice(0, 4);
  const users = useUsers(posts.map((p) => p.authorId));
  return (
    <div className="flex flex-col gap-4">
      {posts.length > 0 ? (
        <PortalGrid posts={posts} users={users} />
      ) : (
        <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
          {feed.items === undefined && !feed.error
            ? "최근 4컷을 불러오고 있어요."
            : "아직 보여 드릴 공개 4컷이 없어요."}
        </p>
      )}
      <Link
        href="/#feed"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
      >
        더 많은 4컷 보기
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}
