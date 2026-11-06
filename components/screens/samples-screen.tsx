"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConceptPicker } from "@/components/concept-picker";
import { DialectPicker } from "@/components/dialect-picker";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { clock } from "@/lib/format";
import { SAMPLES, sampleUrl, startSample, type Sample } from "@/lib/samples";
import type { Concept, Dialect } from "@/lib/types";

export const RECORD = { href: "/record", label: "만들기로" };

/** 샘플 화면: 데모용 가상 대화를 듣고 골라서, 녹음 없이 4컷을 만든다. */
export function SamplesScreen() {
  const router = useRouter();
  const [concept, setConcept] = useState<Concept>("AUTO");
  const [dialect, setDialect] = useState<Dialect>("NONE");
  const [sending, setSending] = useState<string>();
  const [error, setError] = useState<string>();

  async function make(sample: Sample) {
    setError(undefined);
    setSending(sample.id);
    try {
      const id = await startSample(sample, concept, dialect);
      router.push(`/conversations/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setSending(undefined);
    }
  }

  return (
    <AppShell title="샘플로 만들어 보기" back={sending ? undefined : RECORD}>
      <div className="flex flex-col gap-6 pb-8">
        <p className="text-sm text-muted-foreground">
          녹음하지 않아도 돼요. 아래 대화는 데모용으로 지어낸 이야기를 음성
          합성으로 읽은 거예요. 들어 보고 마음에 드는 걸 골라 4컷을 만들어
          보세요.
        </p>
        <ConceptPicker value={concept} onChange={setConcept} />
        <DialectPicker value={dialect} onChange={setDialect} />
        <ul className="flex flex-col gap-4">
          {SAMPLES.map((sample) => (
            <li
              key={sample.id}
              className="flex flex-col gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">{sample.title}</h2>
                <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {sample.topic} · {sample.speakers}명 ·{" "}
                  {clock(sample.durationSec)}
                </p>
              </div>
              <p className="text-sm">{sample.summary}</p>
              <audio
                controls
                preload="none"
                src={sampleUrl(sample)}
                aria-label={`${sample.title} 미리 듣기`}
                className="w-full"
              />
              <Button
                className="w-full"
                disabled={sending !== undefined}
                onClick={() => void make(sample)}
              >
                <Sparkles aria-hidden />
                {sending === sample.id
                  ? "샘플을 올리는 중이에요…"
                  : "이 대화로 만들기"}
              </Button>
            </li>
          ))}
        </ul>
        {error && <ErrorText message={error} />}
      </div>
    </AppShell>
  );
}
