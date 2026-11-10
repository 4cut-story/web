"use client";

import { Check, Circle, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Conversation, ConversationStatus } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const STEPS: { status: ConversationStatus; label: string }[] = [
  { status: "TRANSCRIBING", label: "대화 듣는 중" },
  { status: "SELECTING", label: "장면 고르는 중" },
  { status: "SCRIPTING", label: "대사 쓰는 중" },
  { status: "DRAWING", label: "그리는 중" },
  { status: "SPEAKING", label: "목소리 입히는 중" },
  { status: "COMPOSING", label: "4컷 완성" },
];

const ORDER: ConversationStatus[] = [
  "RECORDING",
  "QUEUED",
  ...STEPS.map((s) => s.status),
  "DONE",
];

const FINAL: ConversationStatus[] = ["DONE", "FAILED", "NO_SCENE"];

export const POLL_MS = 5000;

/** 목소리 단계는 대사를 읽는 대화에만 보인다. */
function stepsOf(c: Conversation) {
  const voiced = c.voiced === true || c.stage === "SPEAKING";
  return STEPS.filter((s) => voiced || s.status !== "SPEAKING");
}

type StepState = "done" | "running" | "failed" | "waiting";

function stepState(c: Conversation, step: ConversationStatus): StepState {
  const current = ORDER.indexOf(c.stage);
  const index = ORDER.indexOf(step);
  if (c.status === "DONE" || current > index) {
    return "done";
  }
  if (current === index) {
    return c.status === "FAILED" ? "failed" : "running";
  }
  return "waiting";
}

const ICONS = {
  done: <Check aria-hidden className="size-5 text-success" />,
  running: (
    <LoaderCircle
      aria-hidden
      className="size-5 animate-spin motion-reduce:animate-none"
    />
  ),
  failed: <X aria-hidden className="size-5 text-destructive" />,
  waiting: <Circle aria-hidden className="size-5 text-muted-foreground" />,
};

/** 진행 상태: 5초마다 확인한다. 끝나면 만화 보기로. */
export function ProgressScreen({ id }: { id: string }) {
  const loaded = useLoad(id, () =>
    api.get<Conversation>(`/conversations/${id}`),
  );
  const c = loaded.data;
  const finished = c !== undefined && FINAL.includes(c.status);
  const article = c?.source === "ARTICLE";
  const { reload } = loaded;

  useEffect(() => {
    if (finished) {
      return;
    }
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
    // reload는 매번 새 함수지만 같은 일을 한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  return (
    <AppShell
      title="4컷 만드는 중"
      back={{ href: "/comics", label: "스토리로" }}
    >
      {loaded.error && (
        <ErrorText message={loaded.error.message} code={loaded.error.code} />
      )}
      {c && (
        <div className="flex flex-col gap-6 pt-4">
          {article && c.sourceTitle && (
            <p className="text-sm text-muted-foreground">
              기사: <span className="text-foreground">{c.sourceTitle}</span>
            </p>
          )}
          <div
            role="progressbar"
            aria-valuenow={c.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary"
              style={{ width: `${c.progress}%` }}
            />
          </div>
          <ol className="flex flex-col gap-3">
            {stepsOf(c).map((step) => {
              const state = stepState(c, step.status);
              return (
                <li
                  key={step.status}
                  className="flex items-center gap-3 text-base"
                  data-state={state}
                >
                  {ICONS[state]}
                  {article && step.status === "TRANSCRIBING"
                    ? "기사 읽고 대화로 바꾸는 중"
                    : step.label}
                </li>
              );
            })}
          </ol>
          {!finished && (
            <p className="text-sm text-muted-foreground">
              화면을 닫아도 계속 만들어요. 다 되면 스토리에 넣어 드려요.
            </p>
          )}
          {c.status === "GPU_WAITING" && (
            <p className="text-sm text-muted-foreground">
              그림 그리는 컴퓨터가 잠시 쉬고 있어요. 켜지면 이어서 만들어요.
            </p>
          )}
          {c.status === "FAILED" && (
            <ErrorText
              message={
                article
                  ? "4컷을 만들지 못했어요. 다시 만들거나 다른 기사로 해 주세요."
                  : "4컷을 만들지 못했어요. 다시 녹음해 주세요."
              }
              code={c.failureReason ?? undefined}
            />
          )}
          {c.status === "NO_SCENE" && (
            <p className="text-base">
              {article
                ? "이 기사에서는 4컷으로 만들 만한 장면을 찾지 못했어요. 다른 기사로 해 보세요."
                : "4컷으로 만들 만한 장면을 찾지 못했어요. 조금 더 길게 이야기해 보세요."}
            </p>
          )}
          {c.status === "DONE" && c.comicId && (
            <Button size="lg" asChild>
              <Link href={`/comics/${c.comicId}`}>4컷 보기</Link>
            </Button>
          )}
          {finished && c.status !== "DONE" && (
            <Button variant="secondary" asChild>
              {article ? (
                <Link href="/article">다른 기사로 만들기</Link>
              ) : (
                <Link href="/record">다시 녹음하기</Link>
              )}
            </Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
