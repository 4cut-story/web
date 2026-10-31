"use client";

import { useState } from "react";

import { Avatar } from "@/components/avatar";
import { ErrorText } from "@/components/empty-state";
import { MoreButton } from "@/components/more-button";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Comment } from "@/lib/types";
import { usePaged } from "@/lib/use-paged";
import { useUsers } from "@/lib/use-users";

/** 댓글 목록과 입력칸. 내 댓글은 지울 수 있다. */
export function Comments({ postId, meId }: { postId: string; meId?: string }) {
  const list = usePaged<Comment>(`/posts/${postId}/comments`);
  const [added, setAdded] = useState<Comment[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const comments = [...(list.items ?? []), ...added].filter(
    (c) => !removed.includes(c.id),
  );
  const users = useUsers(comments.map((c) => c.authorId));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const comment = await api.post<Comment>(`/posts/${postId}/comments`, {
        text,
      });
      setAdded((prev) => [...prev, comment]);
      setText("");
      setError(undefined);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function remove(id: string) {
    try {
      await api.del(`/comments/${id}`);
      setRemoved((prev) => [...prev, id]);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <section aria-label="댓글" className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {comments.map((c) => {
          const name = users[c.authorId]?.nickname ?? "알 수 없음";
          return (
            <li key={c.id} className="flex gap-2 text-sm">
              <Avatar name={name} src={users[c.authorId]?.avatarUrl} />
              <div className="flex-1">
                <span className="font-medium">{name}</span>{" "}
                <span className="text-muted-foreground">
                  {timeAgo(c.createdAt)}
                </span>
                <p className="text-base">{c.text}</p>
              </div>
              {c.authorId === meId && (
                <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                  삭제
                </Button>
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
      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label="댓글 입력"
          placeholder="댓글 달기"
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          className="h-12 flex-1 rounded-lg bg-muted px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          등록
        </Button>
      </form>
      {error && <ErrorText message={error} />}
    </section>
  );
}
