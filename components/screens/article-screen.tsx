"use client";

import { Newspaper } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConceptPicker } from "@/components/concept-picker";
import { DialectPicker } from "@/components/dialect-picker";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { startArticle } from "@/lib/recording";
import type { Concept, Dialect } from "@/lib/types";

/** http, https 주소인지. 서버가 다시 확인한다(내부망 주소 등). */
export function looksLikeUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 기사로 만들기: 기사 주소를 넣으면 서버가 본문을 읽어 기사 속 사람들의 대화로 바꾸고, 녹음과 같은 과정으로 4컷을 그린다.
 * 기사에서는 사실만 가져와 새 이야기로 각색하고, 완성한 만화 맨 아래에 "출처: 언론사명" 링크를 남긴다 (004 기사 활용 지침).
 */
export function ArticleScreen() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [concept, setConcept] = useState<Concept>("AUTO");
  const [dialect, setDialect] = useState<Dialect>("NONE");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!looksLikeUrl(url)) {
      setError("http나 https로 시작하는 기사 주소를 넣어 주세요.");
      return;
    }
    setSending(true);
    try {
      const id = await startArticle(url.trim(), concept, dialect);
      router.push(`/conversations/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setSending(false);
    }
  }

  return (
    <AppShell title="기사로 만들기" tab="create" width="wide">
      {/* RSS 구독과 같은 넓은 틀: 휴대폰은 한 줄, 넓은 화면은 왼쪽 주소·만들기, 오른쪽 그림체·사투리 */}
      <form
        onSubmit={submit}
        className="grid gap-8 pb-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-6 md:sticky md:top-20 md:self-start">
          <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:text-left">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
              <Newspaper aria-hidden className="size-7" />
            </span>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
              기사 주소를 넣으면 AI가 기사에서 사실만 가져와, 우리만의 이야기와
              대화로 각색해 4컷으로 그려요.
            </p>
          </div>
          <label className="flex w-full flex-col gap-2 text-base font-medium">
            기사 주소
            <input
              type="url"
              inputMode="url"
              name="url"
              required
              placeholder="https://news.example.com/article/123"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={sending}
              className="h-12 w-full rounded-lg border border-border bg-background px-4 text-base font-normal"
            />
          </label>
          <ul className="flex w-full flex-col gap-1 text-sm text-muted-foreground">
            <li>
              • 기사에서는 사실만 가져오고, 이야기·인물·대사는 새로 지어 그려요.
            </li>
            <li>
              • 완성한 4컷 맨 아래에 “출처: 언론사명”으로 원문 링크를 남겨요.
            </li>
            <li>
              • 칼럼·사설·인터뷰, 사진·영상 위주 기사, 유료·로그인 기사는 만들
              수 없어요.
            </li>
          </ul>
          <Button size="lg" className="w-full" type="submit" disabled={sending}>
            <Newspaper aria-hidden />
            {sending ? "기사를 읽는 중이에요…" : "4컷으로 만들기"}
          </Button>
          {error && <ErrorText message={error} />}
          <Button variant="link" className="text-muted-foreground" asChild>
            <Link href="/record">녹음해서 만들기</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-6">
          <ConceptPicker value={concept} onChange={setConcept} />
          <DialectPicker value={dialect} onChange={setDialect} />
        </div>
      </form>
    </AppShell>
  );
}
