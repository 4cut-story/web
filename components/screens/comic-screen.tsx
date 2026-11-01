"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorText } from "@/components/empty-state";
import { PublishSheet } from "@/components/publish-sheet";
import { Button } from "@/components/ui/button";
import { api, COMIC_SIZE, errorMessage, imageUrl } from "@/lib/api";
import type { Comic } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** 만화 보기: 만화 전체 폭, 아래에 올리기와 저장. */
export function ComicScreen({ id }: { id: string }) {
  const router = useRouter();
  const loaded = useLoad(id, () => api.get<Comic>(`/comics/${id}`));
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();
  const comic = loaded.data;

  async function remove() {
    setConfirm(false);
    try {
      await api.del(`/comics/${id}`);
      router.push("/comics");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <AppShell
      title={comic?.title ?? "4컷"}
      tab="inbox"
      actions={
        <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          삭제
        </Button>
      }
    >
      {loaded.error && (
        <ErrorText message={loaded.error.message} code={loaded.error.code} />
      )}
      {comic && (
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl("comics", comic.id)}
            alt={comic.title ?? "4컷"}
            {...COMIC_SIZE}
            className="h-auto w-full rounded-lg bg-muted"
          />
          {error && <ErrorText message={error} />}
          {/* 만화가 세로로 길어 버튼을 하단 탭 바로 위에 붙여 둔다 */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-2 bg-background py-3">
            <Button size="lg" variant="secondary" asChild>
              <a
                href={imageUrl("comics", comic.id)}
                download={`4cut-${comic.id}.png`}
              >
                저장
              </a>
            </Button>
            {comic.state === "POSTED" && comic.postId ? (
              <Button size="lg" asChild>
                <Link href={`/posts/${comic.postId}`}>게시물 보기</Link>
              </Button>
            ) : (
              <Button size="lg" onClick={() => setSheet(true)}>
                올리기
              </Button>
            )}
          </div>
        </div>
      )}
      {sheet && comic && (
        <PublishSheet
          comic={comic}
          onClose={() => setSheet(false)}
          onPublished={(postId) => router.push(`/posts/${postId}`)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="4컷을 삭제할까요?"
          description="삭제하면 되돌릴 수 없어요. 게시한 글도 함께 내려가요."
          confirmLabel="삭제"
          onConfirm={remove}
          onCancel={() => setConfirm(false)}
        />
      )}
    </AppShell>
  );
}
