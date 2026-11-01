import { Avatar } from "@/components/avatar";
import { ComicCover } from "@/components/comic-cover";
import { imageUrl } from "@/lib/api";
import type { Post, User } from "@/lib/types";

/**
 * 첫 화면(포털과 피드)의 최근 4컷: 첫 컷과 제목, 작성자를 2열 격자로. 누르면 새 탭에서 게시물 상세(4컷 전체, 좋아요·댓글)를 연다.
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
    <ul className="grid grid-cols-2 gap-3">
      {posts.map((post) => {
        const author = users[post.authorId];
        const name = author?.nickname ?? "알 수 없음";
        return (
          <li key={post.postId}>
            <a
              href={`/posts/${post.postId}`}
              target="_blank"
              rel="noopener"
              className="flex flex-col gap-2"
            >
              <ComicCover
                src={imageUrl("posts", post.postId, true)}
                alt={post.title || post.caption || `${name}님의 4컷`}
              />
              {post.title && (
                <span className="truncate text-sm font-medium">
                  {post.title}
                </span>
              )}
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar name={name} src={author?.avatarUrl} size={20} />
                <span className="truncate">{name}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
