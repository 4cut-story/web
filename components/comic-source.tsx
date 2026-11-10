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

/**
 * 기사로 만든 만화의 출처 한 줄: "출처: 언론사명", 언론사명에 원문 링크 (004 기사 활용 지침 7). 기사 제목은 보이지 않는다(지침 1:
 * 제목·리드도 옮기지 않는다). 녹음으로 만든 만화나 예전 만화는 아무것도 그리지 않는다.
 */
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
  const site =
    source.site?.trim() || new URL(href).hostname.replace(/^www\./, "");
  return (
    <p className="text-xs text-muted-foreground">
      출처:{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="underline underline-offset-4"
      >
        {site}
      </a>
    </p>
  );
}
