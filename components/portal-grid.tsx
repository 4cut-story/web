import { Eye } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { COVER_GRID, COVER_TITLE, ComicCover } from "@/components/comic-cover";
import { displayName, imageUrl } from "@/lib/api";
import { count } from "@/lib/format";
import type { Post, User } from "@/lib/types";

/**
 * 첫 화면(포털과 피드)의 최근 4컷: 첫 컷과 제목, 작성자를 2열 격자로. 누르면 같은 창에서 게시물 상세(4컷 전체, 좋아요·댓글)를 연다.
 * 4컷 전체는 세로로 길어서 첫 화면에서는 첫 컷만 보여 준다.
 */
export function PortalGrid({
  posts,
  users,
}: {
  posts: Post[];
  users: Record<string, User | undefined>;
}) {
  return (
    <ul className={COVER_GRID}>
      {posts.map((post) => {
        const author = users[post.authorId];
        const name = displayName(author) ?? "알 수 없음";
        return (
          <li key={post.postId}>
            <Link
              href={`/posts/${post.postId}`}
              className="group flex flex-col"
            >
              <ComicCover
                src={imageUrl("posts", post.postId, true)}
                alt={post.title || post.caption || `${name}님의 4컷`}
              />
              {post.title && <span className={COVER_TITLE}>{post.title}</span>}
              <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                <Avatar name={name} src={author?.avatarUrl} size={20} />
                <span className="truncate">{name}</span>
                {post.viewCount !== undefined && (
                  <span
                    aria-label={`조회 ${post.viewCount}회`}
                    className="ml-auto flex shrink-0 items-center gap-0.5 tabular-nums"
                  >
                    <Eye aria-hidden className="size-3.5" />
                    {count(post.viewCount)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
