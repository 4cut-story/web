"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell, LoginButton } from "@/components/app-shell";
import { Comments } from "@/components/comments";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorText } from "@/components/empty-state";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import type { Post } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { useViewer } from "@/lib/use-me";
import { useUsers } from "@/lib/use-users";

/** 게시물 상세: 게시물 + 댓글. 내 게시물이면 내리기(만화함으로)와 삭제. */
export function PostScreen({ id }: { id: string }) {
  const router = useRouter();
  const loaded = useLoad(id, () => api.get<Post>(`/posts/${id}`));
  const me = useViewer();
  const anonymous = me.data === null;
  const post = loaded.data;
  const users = useUsers(post ? [post.authorId] : []);
  const [confirm, setConfirm] = useState<"UNPUBLISH" | "DELETE">();
  const [error, setError] = useState<string>();
  const mine = post !== undefined && post.authorId === me.data?.id;

  async function remove(mode: "UNPUBLISH" | "DELETE") {
    setConfirm(undefined);
    try {
      await api.del(`/posts/${id}?mode=${mode}`);
      router.push(mode === "UNPUBLISH" ? "/comics" : "/");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <AppShell
      title="게시물"
      tab={anonymous ? undefined : "feed"}
      actions={
        anonymous ? (
          <LoginButton />
        ) : (
          mine && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm("UNPUBLISH")}
              >
                내리기
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm("DELETE")}
              >
                삭제
              </Button>
            </>
          )
        )
      }
    >
      {loaded.error && (
        <ErrorText message={loaded.error.message} code={loaded.error.code} />
      )}
      {error && <ErrorText message={error} />}
      {post && (
        <div className="flex flex-col gap-6">
          <PostCard post={post} author={users[post.authorId]} />
          <Comments
            postId={post.postId}
            meId={me.data?.id}
            anonymous={anonymous}
          />
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title={
            confirm === "UNPUBLISH"
              ? "게시물을 내릴까요?"
              : "게시물과 만화를 삭제할까요?"
          }
          description={
            confirm === "UNPUBLISH"
              ? "피드에서 내리고 만화는 만화함에 남겨요. 좋아요와 댓글은 사라져요."
              : "만화까지 지워지고 되돌릴 수 없어요."
          }
          confirmLabel={confirm === "UNPUBLISH" ? "내리기" : "삭제"}
          onConfirm={() => remove(confirm)}
          onCancel={() => setConfirm(undefined)}
        />
      )}
    </AppShell>
  );
}
