"use client";

import { Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppShell, HOME } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { clock } from "@/lib/format";
import {
  fileContentType,
  MAX_PARTS,
  MAX_RECORDING_SEC,
  PART_BYTES,
  PartQueue,
  pickMimeType,
  startConversation,
} from "@/lib/recording";

type Phase = "ready" | "recording" | "sending";

/** 녹음 화면: 동의 → 녹음(1분마다 조각 업로드) → 끝내면 진행 화면으로. 파일 올리기도 여기서. */
export function RecordScreen() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "recording") {
      return;
    }
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "recording" && elapsed >= MAX_RECORDING_SEC) {
      recorder.current?.stop();
    }
  }, [phase, elapsed]);

  async function finish(queue: PartQueue, id: string) {
    setPhase("sending");
    try {
      await queue.finish();
      router.push(`/conversations/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setPhase("ready");
    }
  }

  async function start() {
    setError(undefined);
    const mimeType =
      typeof MediaRecorder === "undefined" ? undefined : pickMimeType();
    if (!mimeType || !navigator.mediaDevices) {
      setError("이 브라우저에서는 녹음할 수 없어요. 녹음 파일을 올려 주세요.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(
        "마이크를 쓸 수 없어요. 브라우저 설정에서 마이크를 허용해 주세요.",
      );
      return;
    }
    try {
      const id = await startConversation("RECORDING");
      const queue = new PartQueue(id, mimeType);
      const media = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64_000,
      });
      media.ondataavailable = (event) => {
        if (event.data.size > 0) {
          queue.add(event.data);
        }
      };
      media.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void finish(queue, id);
      };
      recorder.current = media;
      setElapsed(0);
      media.start(60_000);
      setPhase("recording");
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      setError(errorMessage(e));
    }
  }

  async function upload(file: File) {
    setError(undefined);
    const type = fileContentType(file);
    if (!type) {
      setError(
        "지원하지 않는 파일이에요. m4a, mp3, wav, webm 파일을 올려 주세요.",
      );
      return;
    }
    if (file.size > PART_BYTES * MAX_PARTS) {
      setError("파일이 너무 커요. 50MB 이하로 올려 주세요.");
      return;
    }
    try {
      const id = await startConversation("UPLOAD");
      const queue = new PartQueue(id, type);
      queue.add(file);
      await finish(queue, id);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    // 녹음하는 동안에는 실수로 나가지 않게 ‹를 숨긴다
    <AppShell title="만들기" back={phase === "ready" ? HOME : undefined}>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        {phase === "ready" && (
          <>
            <label className="flex items-start gap-3 text-left text-base">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 size-5 accent-foreground"
              />
              함께 대화하는 사람들에게 녹음해 4컷으로 만든다고 알리고 동의를
              받았어요.
            </label>
            <Button
              size="lg"
              className="w-full"
              disabled={!consent}
              onClick={start}
            >
              녹음 시작
            </Button>
          </>
        )}
        {phase === "recording" && (
          <>
            <p className="flex items-center gap-2 text-base text-muted-foreground">
              <span aria-hidden className="size-2.5 rounded-full bg-accent" />
              녹음 중
            </p>
            <p className="text-5xl font-semibold tabular-nums">
              {clock(elapsed)}
            </p>
            <p className="text-sm text-muted-foreground">
              남은 시간 {clock(MAX_RECORDING_SEC - elapsed)}
            </p>
            <button
              type="button"
              aria-label="녹음 끝내기"
              onClick={() => recorder.current?.stop()}
              className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Square className="size-7 fill-current" />
            </button>
          </>
        )}
        {phase === "sending" && (
          <p className="text-base">녹음을 올리는 중이에요…</p>
        )}
        {error && <ErrorText message={error} />}
      </div>
      {phase === "ready" && (
        <div className="flex justify-center pb-8">
          <input
            ref={fileInput}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.webm"
            aria-label="녹음 파일"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void upload(file);
              }
            }}
          />
          <Button
            variant="link"
            className="text-muted-foreground"
            disabled={!consent}
            onClick={() => fileInput.current?.click()}
          >
            녹음 파일 올리기
          </Button>
        </div>
      )}
    </AppShell>
  );
}
