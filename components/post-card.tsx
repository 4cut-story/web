"use client";

import { Check, Heart, Lock, MessageCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { api, COMIC_SIZE, imageUrl, userPath } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Post, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION =
  "flex h-10 items-center gap-1.5 rounded-full px-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** 피드·게시물 상세의 게시물 하나: 작성자 줄 → 만화 → 행동 줄 → 캡션. */
export function PostCard({ post, author }: { post: Post; author?: User }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);
  const name = author?.nickname ?? "알 수 없음";
  const [shared, setShared] = useState(false);

  /** 휴대폰은 공유 시트, PC는 주소 복사. */
  async function share() {
    const url = new URL(`/posts/${post.postId}`, window.location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title ?? "4cut story", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // 사용자가 공유를 닫았거나 복사를 막은 경우는 조용히 넘어간다
    }
  }

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
          alt={post.caption || `${name}님의 4컷`}
          {...COMIC_SIZE}
          className="h-auto w-full rounded-lg bg-muted"
        />
      </Link>
      <div className="-ml-2 flex items-center gap-1 text-sm font-semibold">
        <button
          type="button"
          aria-label="좋아요"
          aria-pressed={liked}
          onClick={toggleLike}
          className={ACTION}
        >
          <Heart
            className={cn(
              "size-6 transition-transform active:scale-90",
              liked && "fill-accent text-accent",
            )}
          />
          <span className="tabular-nums">{likes}</span>
        </button>
        <Link
          href={`/posts/${post.postId}`}
          aria-label="댓글 보기"
          className={ACTION}
        >
          <MessageCircle className="size-6" />
          <span className="tabular-nums">{post.commentCount}</span>
        </Link>
        <button
          type="button"
          aria-label={shared ? "주소를 복사했어요" : "공유"}
          title="공유"
          onClick={share}
          className={cn(ACTION, "ml-auto")}
        >
          {shared ? (
            <Check className="size-6 text-success" />
          ) : (
            <Share2 className="size-6" />
          )}
        </button>
      </div>
      {/* 제목은 만화 위에 그려져 있으니, 캡션이 제목과 같으면 다시 쓰지 않는다 */}
      {post.caption && post.caption !== post.title && (
        <p className="text-base">{post.caption}</p>
      )}
    </article>
  );
}
