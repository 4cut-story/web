"use client";

import { Mic, Newspaper, Sparkles, Square, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConceptPicker } from "@/components/concept-picker";
import { DialectPicker } from "@/components/dialect-picker";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { clock } from "@/lib/format";
import type { Concept, Dialect } from "@/lib/types";
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
  const [concept, setConcept] = useState<Concept>("AUTO");
  const [dialect, setDialect] = useState<Dialect>("NONE");
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [gpuOffline, setGpuOffline] = useState(false);

  // GPU PC가 꺼져 있으면 녹음 전에 알린다. 확인하지 못하면 아무것도 보이지 않는다
  useEffect(() => {
    api
      .get<{ online: boolean }>("/conversations/gpu-status")
      .then((s) => setGpuOffline(s.online === false))
      .catch(() => undefined);
  }, []);

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
      const id = await startConversation("RECORDING", concept, dialect);
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
      const id = await startConversation("UPLOAD", concept, dialect);
      const queue = new PartQueue(id, type);
      queue.add(file);
      await finish(queue, id);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const ready = phase === "ready";

  return (
    // 녹음하는 동안에는 실수로 나가지 않게 메뉴를 숨긴다
    <AppShell
      title="만들기"
      tab={ready ? "create" : undefined}
      width={ready ? "wide" : "narrow"}
    >
      {ready ? (
        // 기사로 만들기·RSS 구독과 같은 넓은 틀: 휴대폰은 한 줄, 넓은 화면은 왼쪽 동의·시작, 오른쪽 그림체·사투리
        <div className="grid gap-8 pb-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6 md:sticky md:top-20 md:self-start">
            <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:text-left">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
                <Mic aria-hidden className="size-7" />
              </span>
              <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
                대화를 녹음하면 AI가 받아 적고, 가장 재미있는 장면을 골라
                4컷으로 그려요.
              </p>
            </div>
            {gpuOffline && (
              <p className="text-sm text-muted-foreground">
                지금은 그림 그리는 컴퓨터가 쉬고 있어요. 녹음은 받아 두고,
                컴퓨터가 켜지면 이어서 만들어요.
              </p>
            )}
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
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full"
                disabled={!consent}
                onClick={start}
              >
                <Mic aria-hidden />
                녹음 시작
              </Button>
              <Button size="lg" variant="outline" className="w-full" asChild>
                <Link href="/record/samples">
                  <Sparkles aria-hidden />
                  녹음 없이 샘플로 만들어 보기
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full" asChild>
                <Link href="/article">
                  <Newspaper aria-hidden />
                  기사 주소로 만들기
                </Link>
              </Button>
            </div>
            {error && <ErrorText message={error} />}
            <div className="flex justify-center">
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
                <Upload aria-hidden />
                녹음 파일 올리기
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <ConceptPicker value={concept} onChange={setConcept} />
            <DialectPicker value={dialect} onChange={setDialect} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
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
      )}
    </AppShell>
  );
}
