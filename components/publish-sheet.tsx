"use client";

import { useState } from "react";

import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import type { Comic, Visibility } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_CAPTION = 100;

/** 게시 시트: 실명 경고, 캡션, 공개 범위, 동의 → 올리기. 기본값을 채워 두어 두 번 탭으로 끝난다. */
export function PublishSheet({
  comic,
  onClose,
  onPublished,
}: {
  comic: Comic;
  onClose: () => void;
  onPublished: (postId: string) => void;
}) {
  const [caption, setCaption] = useState(comic.title ?? "");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    try {
      const { postId } = await api.post<{ postId: string }>("/posts", {
        comicId: comic.id,
        caption,
        visibility,
        participantsConsented: consent,
      });
      onPublished(postId);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/40"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="게시하기"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col gap-5 rounded-t-xl bg-background px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <h2 className="text-lg font-semibold">게시하기</h2>
        {comic.nameWarnings.length > 0 && (
          <div className="rounded-lg bg-muted p-4 text-sm">
            4컷에 실명으로 보이는 이름이 있어요: {comic.nameWarnings.join(", ")}
            . 올리기 전에 꼭 확인해 주세요.
          </div>
        )}
        <label className="flex flex-col gap-2 text-sm font-medium">
          캡션
          <textarea
            value={caption}
            maxLength={MAX_CAPTION}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            className="resize-none rounded-lg bg-muted p-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="self-end text-xs text-muted-foreground">
            {MAX_CAPTION - caption.length}자 남음
          </span>
        </label>
        <div
          role="radiogroup"
          aria-label="공개 범위"
          className="grid grid-cols-2 rounded-lg bg-muted p-1"
        >
          {(
            [
              ["PUBLIC", "전체 공개"],
              ["FOLLOWERS", "팔로워만"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={visibility === value}
              onClick={() => setVisibility(value)}
              className={cn(
                "h-10 rounded-md text-sm font-medium",
                visibility === value
                  ? "bg-background"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-start gap-3 text-base">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 size-5 accent-foreground"
          />
          함께 대화한 사람들이 게시에 동의했어요.
        </label>
        {error && <ErrorText message={error} />}
        <Button size="lg" disabled={!consent || busy} onClick={publish}>
          올리기
        </Button>
      </section>
    </div>
  );
}
