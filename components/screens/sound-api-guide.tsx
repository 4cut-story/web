import { SITE_URL } from "@/lib/seo";

const BASE = `${SITE_URL}/api/open/v1/sounds`;

const PARAMS: [string, string][] = [
  [
    "q",
    "찾는 소리를 말로 적어요(50자까지). 설명이 가까운 순으로 줘요. 예: 비 오는 골목, 문 두드리는 소리",
  ],
  ["kind", "AMBIENCE(배경음), EFFECT(효과음), MUSIC(배경음악) 중 하나"],
  ["category", "카테고리 코드. /facets에서 확인해요"],
  ["mood", "분위기 코드. /facets에서 확인해요"],
  ["size", "한 번에 받을 개수 (기본 20, 최대 50)"],
  ["cursor", "다음 페이지. 앞 응답의 nextCursor를 넣어요 (검색어가 없을 때만)"],
];

const ENDPOINTS: [string, string][] = [
  ["GET /api/open/v1/sounds", "목록과 검색"],
  ["GET /api/open/v1/sounds/facets", "종류·카테고리·분위기별 개수"],
  ["GET /api/open/v1/sounds/{id}", "소리 하나와 비슷한 소리"],
];

const EXAMPLE = `{
  "items": [
    {
      "id": "V1StGXR8_Z5jdHi6B-myT",
      "kind": "EFFECT",
      "category": "DOOR_KNOCK",
      "title": "나무 문 두드리는 소리",
      "description": "...",
      "moods": ["TENSE"],
      "places": ["집"],
      "durationMs": 4200,
      "credit": { "author": "...", "license": "CC0", ... },
      "audioUrl": "${SITE_URL}/api/images/sounds/V1StGXR8_Z5jdHi6B-myT",
      "pageUrl": "${SITE_URL}/sounds/V1StGXR8_Z5jdHi6B-myT"
    }
  ],
  "nextCursor": null
}`;

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

/** 소리 검색 API 사용법. 개인 토큰 화면 아래에 보인다. */
export function SoundApiGuide() {
  return (
    <section
      aria-labelledby="sound-api"
      className="flex flex-col gap-3 border-t border-input pt-6 text-sm"
    >
      <h2 id="sound-api" className="text-base font-semibold">
        소리 검색 API 사용법
      </h2>
      <p className="text-muted-foreground">
        사이트의 배경음·효과음을 프로그램에서 찾을 수 있어요. 위에서{" "}
        <strong>소리 검색</strong> 권한으로 토큰을 발급해 머리글에 넣어 보내요.
        토큰이 없으면 401, 게시 토큰이면 403이에요. 토큰 하나로 1분에 60번까지
        부를 수 있어요(넘으면 429).
      </p>
      <ul className="flex flex-col gap-1">
        {ENDPOINTS.map(([path, desc]) => (
          <li key={path}>
            <code>{path}</code> · {desc}
          </li>
        ))}
      </ul>
      <Code>{`curl -G "${BASE}" \\
  -H "Authorization: Bearer fcp_..." \\
  --data-urlencode "q=비 오는 골목" \\
  --data-urlencode "kind=AMBIENCE" \\
  --data-urlencode "size=10"`}</Code>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="py-1 pr-3">파라미터</th>
            <th className="py-1">설명</th>
          </tr>
        </thead>
        <tbody>
          {PARAMS.map(([name, desc]) => (
            <tr key={name} className="border-t border-input align-top">
              <td className="py-1 pr-3">
                <code>{name}</code>
              </td>
              <td className="py-1 text-muted-foreground">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted-foreground">
        응답의 <code>audioUrl</code>로 MP3를 바로 받을 수 있어요. 소리는 공개
        데이터셋(FSD50K, Free Music Archive)의 소리라 상업적으로도 쓸 수 있지만,
        CC BY 소리는 <code>credit</code>의 저작자·라이선스를 함께 표시해야 해요.
      </p>
      <Code>{EXAMPLE}</Code>
    </section>
  );
}
