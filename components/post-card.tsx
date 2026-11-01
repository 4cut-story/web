"use client";

import { Heart, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { api, COMIC_SIZE, imageUrl, userPath } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Post, User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 피드·게시물 상세의 게시물 하나: 작성자 줄 → 만화 → 행동 줄 → 캡션. */
export function PostCard({ post, author }: { post: Post; author?: User }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);
  const name = author?.nickname ?? "알 수 없음";

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await (next
        ? api.put(`/posts/${post.postId}/like`)
        : api.del(`/posts/${post.postId}/like`));
    } catch {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
  }

  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={author ? userPath(author.nickname) : `/users/${post.authorId}`}
          className="flex items-center gap-2 font-medium"
        >
          <Avatar name={name} src={author?.avatarUrl} />
          {name}
        </Link>
        <span className="text-muted-foreground">
          {timeAgo(post.publishedAt)}
        </span>
        {post.visibility === "FOLLOWERS" && (
          <Lock
            aria-label="팔로워만"
            className="size-4 text-muted-foreground"
          />
        )}
      </div>
      <Link href={`/posts/${post.postId}`}>
        {/* 권한 확인 뒤 web이 바이트를 넘기는 주소라 next/image 최적화를 쓰지 않는다 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl("posts", post.postId)}
          alt={post.caption || `${name}님의 4컷 만화`}
          {...COMIC_SIZE}
          className="h-auto w-full rounded-lg bg-muted"
        />
      </Link>
      <div className="flex items-center gap-4 text-sm font-semibold">
        <button
          type="button"
          aria-label="좋아요"
          aria-pressed={liked}
          onClick={toggleLike}
          className="flex items-center gap-1"
        >
          <Heart className={cn("size-6", liked && "fill-accent text-accent")} />
          <span className="tabular-nums">{likes}</span>
        </button>
        <Link
          href={`/posts/${post.postId}`}
          aria-label="댓글 보기"
          className="flex items-center gap-1"
        >
          <MessageCircle className="size-6" />
          <span className="tabular-nums">{post.commentCount}</span>
        </Link>
      </div>
      {/* 제목은 만화 위에 그려져 있으니, 캡션이 제목과 같으면 다시 쓰지 않는다 */}
      {post.caption && post.caption !== post.title && (
        <p className="text-base">{post.caption}</p>
      )}
    </article>
  );
}
