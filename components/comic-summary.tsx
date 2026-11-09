/**
 * 만화 아래 줄거리 요약. 만화 컷에 담지 못한 앞뒤 사정까지 몇 문장으로 보여 준다. 콘티를 만들 때 함께 만든다. 요약이 없는 예전 만화는 아무것도
 * 그리지 않는다.
 */
export function ComicSummary({ summary }: { summary?: string | null }) {
  const text = summary?.trim();
  if (!text) {
    return null;
  }
  return (
    <section aria-label="줄거리" className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">줄거리</h2>
      <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
        {text}
      </p>
    </section>
  );
}
