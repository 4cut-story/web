import { ExternalLink, Newspaper } from "lucide-react";

import type { Production } from "@/lib/types";

/** 출처 주소가 http, https일 때만 링크로 쓴다 (javascript: 같은 주소는 보이지 않는다). */
export function safeHttpUrl(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

/** 기사로 만든 만화의 원문 출처. 녹음으로 만든 만화나 예전 만화는 아무것도 그리지 않는다. */
export function ComicSource({
  production,
}: {
  production?: Production | null;
}) {
  const source = production?.source;
  const href = safeHttpUrl(source?.url);
  if (source?.type !== "ARTICLE" || !href) {
    return null;
  }
  const site = source.site?.trim() || new URL(href).hostname;
  const title = source.title?.trim() || site;
  return (
    <section aria-label="원문 기사" className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 text-base font-semibold">
        <Newspaper aria-hidden className="size-4" />
        원문 기사
      </h2>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex items-start gap-1.5 text-sm leading-relaxed text-foreground underline underline-offset-4"
      >
        <span>
          {title}
          <span className="text-muted-foreground"> · {site}</span>
        </span>
        <ExternalLink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      </a>
      <p className="text-xs text-muted-foreground">
        기사 내용을 바탕으로 AI가 새로 쓴 대화로 그렸어요. 자세한 내용은
        원문에서 확인해 주세요.
      </p>
    </section>
  );
}
