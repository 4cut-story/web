import type { Metadata } from "next";

/** 검색·공유에 쓰는 사이트 정보. 서버(메타데이터·sitemap·robots)에서만 읽는다. */
export const SITE_NAME = "4cut story";

/** 공개 주소. 빌드 때는 PUBLIC_BASE_URL이 없을 수 있어 운영 주소를 기본값으로 둔다. */
export const SITE_URL = (
  process.env.PUBLIC_BASE_URL ?? "https://4cut.java21.net"
).replace(/\/$/, "");

export const SITE_DESCRIPTION =
  "친구·가족과 나눈 대화를 녹음하면 AI가 재미있는 장면을 골라 4컷 만화로 그려 주는 서비스예요. 다른 사람이 올린 4컷도 구경해 보세요.";

/**
 * 검색 서비스 소유 확인 값(Google Search Console·네이버 서치어드바이저의 HTML 태그 content). 비밀 값이 아니라
 * 누구나 볼 수 있는 페이지 <meta>로 나간다. 비어 있으면 태그를 넣지 않는다.
 */
export const SEARCH_VERIFICATION: Metadata["verification"] = {
  google: undefined,
  other: {},
};

/** 기본 공유 그림 (public/og.png, 1200×630). */
export const DEFAULT_OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "4cut story: 대화를 녹음하면 4컷 만화가 돼요",
};

/** 검색 결과에 넣지 않을 화면(로그인해야 보이는 화면, 공개되지 않은 게시물). 링크는 따라가도 된다. */
export const NOINDEX: Metadata["robots"] = { index: false, follow: true };

/** 로그인해야 보이는 화면의 메타데이터. */
export const PRIVATE_PAGE: Metadata = { robots: NOINDEX };

/** 검색 결과 설명에 맞게 공백을 줄이고 max자에서 자른다. */
export function excerpt(text: string | null | undefined, max = 150): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

type OpenGraph = NonNullable<Metadata["openGraph"]>;
type Twitter = NonNullable<Metadata["twitter"]>;

/**
 * 페이지별 Open Graph. 하위 페이지의 openGraph는 상위 값을 통째로 바꾸므로 사이트 이름·언어·기본 그림을 매번 함께 넣는다.
 */
export function openGraph(page: OpenGraph): OpenGraph {
  return {
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [DEFAULT_OG_IMAGE],
    ...page,
  } as OpenGraph;
}

/** 페이지별 트위터(X) 카드. 그림이 없으면 기본 공유 그림을 큰 카드로 보여 준다. */
export function twitterCard(page: Twitter): Twitter {
  return {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE.url],
    ...page,
  } as Twitter;
}

/** 고정 화면의 제목·설명·대표 주소·공유 정보를 한 번에 만든다. */
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: openGraph({ title, description, url: path }),
    twitter: twitterCard({ title, description }),
  };
}

export function absoluteUrl(path: string): string {
  return SITE_URL + path;
}

/** 구조화 데이터 <script>에 넣을 JSON. </script>로 태그가 닫히지 않게 <를 이스케이프한다. */
export function jsonLdText(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** 첫 화면 구조화 데이터: 사이트와 운영 조직. */
export function siteJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        alternateName: ["4컷 스토리", "4cut"],
        description: SITE_DESCRIPTION,
        inLanguage: "ko-KR",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: absoluteUrl("/icon.png"),
        sameAs: ["https://github.com/4cut-story"],
      },
    ],
  };
}
