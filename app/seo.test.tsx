import { render } from "@testing-library/react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CharacterPage, {
  generateMetadata as characterMeta,
} from "./characters/[id]/page";
import PostPage, { generateMetadata as postMeta } from "./posts/[id]/page";
import manifest from "./manifest";
import robots from "./robots";
import sitemap from "./sitemap";
import SoundPage, { generateMetadata as soundMeta } from "./sounds/[id]/page";
import UserPage, { generateMetadata as userMeta } from "./u/[nickname]/page";
import ProfilePage, {
  generateMetadata as profileMeta,
} from "./users/[id]/page";
import { Resolve } from "@/components/awaited";
import { JsonLd } from "@/components/json-ld";
import { excerpt, jsonLdText, siteJsonLd } from "@/lib/seo";
import { GW } from "@/test/server";
import { json, mockFetch } from "@/test/fetch-mock";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("next/server", async (original) => ({
  ...(await original<object>()),
  connection: vi.fn(async () => undefined),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const ID = "post1aaaaaaaaaaaaaaaa";

describe("검색 노출 공통", () => {
  it("설명은 공백을 줄이고 길면 말줄임표로 자른다", () => {
    expect(excerpt(" 가  나\n다 ")).toBe("가 나 다");
    expect(excerpt("가".repeat(200), 10)).toBe(`${"가".repeat(9)}…`);
    expect(excerpt(null)).toBe("");
  });

  it("구조화 데이터 글에 </script>가 있어도 태그가 닫히지 않는다", () => {
    expect(jsonLdText({ a: "</script>" })).toBe('{"a":"\\u003c/script>"}');
    const { container } = render(<JsonLd data={{ a: 1 }} />);
    expect(
      container.querySelector('script[type="application/ld+json"]')?.innerHTML,
    ).toBe('{"a":1}');
    const empty = render(<JsonLd data={null} />);
    expect(empty.container.innerHTML).toBe("");
  });

  it("첫 화면 구조화 데이터는 사이트와 조직을 알린다", () => {
    const graph = (siteJsonLd() as { "@graph": { "@type": string }[] })[
      "@graph"
    ];
    expect(graph.map((g) => g["@type"])).toEqual(["WebSite", "Organization"]);
  });

  it("robots.txt는 로그인 화면과 API를 막고 공유 그림과 사이트맵을 연다", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.allow).toContain("/api/images/");
    expect(rule.disallow).toEqual(
      expect.arrayContaining(["/api/", "/me", "/comics", "/conversations"]),
    );
    expect(r.sitemap).toBe("https://4cut.java21.net/sitemap.xml");
  });

  it("웹 앱 매니페스트는 브랜드 아이콘과 색을 알린다", () => {
    const m = manifest();
    expect(m.name).toBe("4cut story");
    expect(m.icons?.map((i) => i.src)).toContain("/icons/icon-512.png");
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("sitemap.xml은 요청 때 만든다", async () => {
    mockFetch({});
    const entries = await sitemap();
    expect(entries[0].url).toBe("https://4cut.java21.net/");
  });
});

describe("상세 페이지 메타데이터와 구조화 데이터", () => {
  it("상세 페이지는 경로 값으로 메타데이터를 만든다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/posts/${ID}`]: json({
        postId: ID,
        authorId: "user1aaaaaaaaaaaaaaaa",
        title: "제목",
        caption: null,
        visibility: "PUBLIC",
        publishedAt: "2026-11-10T00:00:00Z",
        likeCount: 0,
        commentCount: 0,
      }),
    });
    const params = Promise.resolve({ id: ID });
    expect((await postMeta({ params })).title).toBe("제목");
    expect((await characterMeta({ params })).title).toBe("캐릭터");
    expect((await soundMeta({ params })).title).toBe("배경음");
    expect((await profileMeta({ params })).title).toBe("프로필");
    expect(
      (await userMeta({ params: Promise.resolve({ nickname: "%EB%A7%88" }) }))
        .title,
    ).toBe("사용자");
    expect(isValidElement(CharacterPage({ params } as never))).toBe(true);
    expect(isValidElement(SoundPage({ params } as never))).toBe(true);
    expect(isValidElement(ProfilePage({ params } as never))).toBe(true);
  });

  it("게시물·사용자 페이지는 화면 옆에 구조화 데이터를 따로 기다려 넣는다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/users/lookup`]: json({
        id: "user1aaaaaaaaaaaaaaaa",
        nickname: "마",
        avatarUrl: null,
      }),
    });
    const second = async (page: ReactElement) => {
      const children = (page.props as { children: ReactElement[] }).children;
      const ld = children[1].props as {
        value: Promise<unknown>;
        render: (v: unknown) => ReactNode;
      };
      return Resolve(ld);
    };
    const post = await second(
      PostPage({ params: Promise.resolve({ id: ID }) }),
    );
    expect((post as ReactElement<{ data: unknown }>).props.data).toBeNull();
    const user = await second(
      UserPage({ params: Promise.resolve({ nickname: "%EB%A7%88" }) }),
    );
    expect(
      (user as ReactElement<{ data: { "@type": string } }>).props.data["@type"],
    ).toBe("ProfilePage");
  });
});
