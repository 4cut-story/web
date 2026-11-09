"use client";

import { EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell, HOME, LoginButton } from "@/components/app-shell";
import { ComicCast } from "@/components/comic-cast";
import { ComicSummary } from "@/components/comic-summary";
import { ComicProduction } from "@/components/comic-production";
import { ComicSource } from "@/components/comic-source";
import { Comments } from "@/components/comments";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorText } from "@/components/empty-state";
import { LivePlayer } from "@/components/live-player";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { ViewModeToggle, type ViewMode } from "@/components/view-mode";
import { api, errorMessage } from "@/lib/api";
import type { Post } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { useViewer } from "@/lib/use-me";
import { useUsers } from "@/lib/use-users";

/** 게시물 상세: 게시물 + 댓글. 내 게시물이면 내리기(스토리로)와 삭제. */
export function PostScreen({ id }: { id: string }) {
  const router = useRouter();
  const loaded = useLoad(id, () => api.get<Post>(`/posts/${id}`));
  const me = useViewer();
  const anonymous = me.data === null;
  const post = loaded.data;
  const users = useUsers(post ? [post.authorId] : []);
  const [confirm, setConfirm] = useState<"UNPUBLISH" | "DELETE">();
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<ViewMode>("comic");
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
      back={anonymous ? HOME : undefined}
      tab={anonymous ? undefined : "feed"}
      width="wide"
      actions={
        anonymous ? (
          <LoginButton />
        ) : (
          mine && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label="내리기"
                title="피드에서 내리기"
                onClick={() => setConfirm("UNPUBLISH")}
              >
                <EyeOff aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="삭제"
                title="삭제"
                onClick={() => setConfirm("DELETE")}
              >
                <Trash2 aria-hidden />
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
        // PC: 세로로 긴 4컷은 왼쪽, 댓글은 오른쪽에 붙여 둔다
        // 라이브 모드는 가로 16:9라 같은 폭이면 키가 낮아진다. 그림 칸을 넓혀 4컷과 비슷한 크기로 보이게 한다
        <div
          className={
            post.live && mode === "live"
              ? "flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[minmax(0,46rem)_minmax(0,1fr)] lg:gap-10"
              : "flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:items-start md:gap-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-12"
          }
        >
          <div className="flex flex-col gap-6">
            {post.live && <ViewModeToggle mode={mode} onChange={setMode} />}
            <PostCard
              post={post}
              author={users[post.authorId]}
              media={
                post.live && mode === "live" ? (
                  <LivePlayer
                    kind="posts"
                    id={post.postId}
                    title={post.title}
                  />
                ) : undefined
              }
            />
            <ComicSummary summary={post.summary} />
            <ComicSource production={post.production} />
            <ComicCast
              cast={post.cast}
              concept={post.concept}
              dialect={post.dialect}
              source={{ kind: "posts", id: post.postId }}
            />
            <ComicProduction production={post.production} />
          </div>
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
              : "게시물과 4컷을 삭제할까요?"
          }
          description={
            confirm === "UNPUBLISH"
              ? "피드에서 내리고 4컷은 스토리에 남겨요. 좋아요와 댓글은 사라져요."
              : "4컷까지 지워지고 되돌릴 수 없어요."
          }
          confirmLabel={confirm === "UNPUBLISH" ? "내리기" : "삭제"}
          onConfirm={() => remove(confirm)}
          onCancel={() => setConfirm(undefined)}
        />
      )}
    </AppShell>
  );
}
