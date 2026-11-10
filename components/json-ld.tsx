import { jsonLdText } from "@/lib/seo";

/** 검색 엔진용 구조화 데이터(JSON-LD). 실행되지 않는 데이터 블록이다. 값이 없으면 아무것도 그리지 않는다. */
export function JsonLd({ data }: { data: object | null }) {
  if (!data) {
    return null;
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdText(data) }}
    />
  );
}
