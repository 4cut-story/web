// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  characterMetadata,
  postJsonLd,
  postMetadata,
  profileMetadata,
  sitemapEntries,
  soundMetadata,
  userJsonLd,
  userMetadata,
} from "./seo";
import { GW } from "@/test/server";
import { json, mockFetch } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
});

const SITE = "https://4cut.java21.net";
const POST_ID = "post1aaaaaaaaaaaaaaaa";
const USER_ID = "user1aaaaaaaaaaaaaaaa";
const CHAR_ID = "char1aaaaaaaaaaaaaaaa";
const SOUND_ID = "sound1aaaaaaaaaaaaaaa";

const user = {
  id: USER_ID,
  nickname: "마르코",
  avatarUrl: "https://example.com/a.png",
  joinedAt: "2026-11-01T00:00:00Z",
};

function post(over: Record<string, unknown> = {}) {
  return {
    postId: POST_ID,
    comicId: "comic1aaaaaaaaaaaaaaa",
    authorId: USER_ID,
    title: "유성우 대신 본 것",
    caption: "별 보러 간 옥상",
    visibility: "PUBLIC",
    publishedAt: "2026-11-10T04:08:41Z",
    likeCount: 3,
    commentCount: 1,
    likedByMe: false,
    summary: "옥상에서   별을 보다가\n핫초코만 마셨다.",
    ...over,
  };
}

describe("게시물 메타데이터 (검색·공유)", () => {
  it("전체 공개 게시물은 제목·요약·대표 주소·첫 컷 그림을 넣는다", async () => {
    const calls = mockFetch({
      [`GET ${GW}/api/v1/posts/${POST_ID}`]: json(post()),
      [`GET ${GW}/api/v1/users/${USER_ID}`]: json(user),
    });
    const meta = await postMetadata(POST_ID);
    expect(meta.title).toBe("유성우 대신 본 것");
    expect(meta.description).toBe("옥상에서 별을 보다가 핫초코만 마셨다.");
    expect(meta.alternates?.canonical).toBe(`/posts/${POST_ID}`);
    expect(meta.robots).toBeUndefined();
    expect(meta.openGraph).toMatchObject({
      type: "article",
      siteName: "4cut story",
      locale: "ko_KR",
      images: [{ url: `/api/images/posts/${POST_ID}?size=thumb` }],
      authors: [`${SITE}/@%EB%A7%88%EB%A5%B4%EC%BD%94`],
    });
    expect(meta.twitter).toMatchObject({ card: "summary" });
    // 로그인 없이 부른다 (검색 로봇이 보는 것과 같게)
    expect(
      (calls[0].init?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("요약이 없으면 설명, 그것도 없으면 만든 사람으로 설명을 채운다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/posts/${POST_ID}`]: json(
        post({ summary: null, caption: null, title: " " }),
      ),
    });
    const meta = await postMetadata(POST_ID);
    expect(meta.title).toBe("4컷 만화");
    expect(meta.description).toBe("누군가님이 대화로 만든 4컷 만화예요.");
    expect((meta.openGraph as { authors?: string[] }).authors).toBeUndefined();
  });

  it("팔로워 공개·없는 게시물·잘못된 ID는 검색에서 뺀다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/posts/${POST_ID}`]: json(
        post({ visibility: "FOLLOWERS" }),
      ),
    });
    expect((await postMetadata(POST_ID)).robots).toEqual({
      index: false,
      follow: true,
    });
    expect(await postJsonLd(POST_ID)).toBeNull();
    expect((await postMetadata("bad")).robots).toMatchObject({ index: false });
  });

  it("게이트웨이가 안 되면 화면은 두고 검색에서만 뺀다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("down"))),
    );
    expect((await postMetadata(POST_ID)).robots).toMatchObject({
      index: false,
    });
  });

  it("구조화 데이터는 SocialMediaPosting으로 작성자·좋아요·댓글 수를 넣는다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/posts/${POST_ID}`]: json(post()),
      [`GET ${GW}/api/v1/users/${USER_ID}`]: json(user),
    });
    const data = (await postJsonLd(POST_ID)) as Record<string, unknown>;
    expect(data).toMatchObject({
      "@type": "SocialMediaPosting",
      url: `${SITE}/posts/${POST_ID}`,
      headline: "유성우 대신 본 것",
      image: `${SITE}/api/images/posts/${POST_ID}`,
      author: { "@type": "Person", name: "마르코" },
      interactionStatistic: [
        { userInteractionCount: 3 },
        { userInteractionCount: 1 },
      ],
    });
  });

  it("작성자를 못 읽으면 작성자 없이 구조화 데이터를 만든다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/posts/${POST_ID}`]: json(
        post({ summary: null, caption: null }),
      ),
    });
    const data = (await postJsonLd(POST_ID)) as Record<string, unknown>;
    expect(data.author).toBeUndefined();
    expect(data.text).toBeUndefined();
  });
});

describe("사용자·캐릭터·배경음 메타데이터", () => {
  it("사용자 페이지는 /@닉네임을 대표 주소로 두고 ProfilePage 구조화 데이터를 만든다", async () => {
    mockFetch({ [`GET ${GW}/api/v1/users/lookup`]: json(user) });
    const meta = await userMetadata("마르코");
    expect(meta.title).toBe("마르코님의 4컷");
    expect(meta.alternates?.canonical).toBe("/@%EB%A7%88%EB%A5%B4%EC%BD%94");
    expect(meta.openGraph).toMatchObject({ type: "profile" });
    expect(await userJsonLd("마르코")).toMatchObject({
      "@type": "ProfilePage",
      mainEntity: { name: "마르코", image: "https://example.com/a.png" },
    });
  });

  it("없는 사용자는 검색에서 뺀다", async () => {
    mockFetch({});
    expect((await userMetadata("없음")).robots).toMatchObject({
      index: false,
    });
    expect(await userJsonLd("없음")).toBeNull();
    expect((await profileMetadata(USER_ID)).robots).toMatchObject({
      index: false,
    });
  });

  it("/users/아이디는 /@닉네임을 대표 주소로 둔다", async () => {
    mockFetch({ [`GET ${GW}/api/v1/users/${USER_ID}`]: json(user) });
    const meta = await profileMetadata(USER_ID);
    expect(meta.alternates?.canonical).toBe("/@%EB%A7%88%EB%A5%B4%EC%BD%94");
  });

  it("캐릭터는 이름·직업과 첫 모습 그림을 넣는다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/characters/${CHAR_ID}`]: json({
        id: CHAR_ID,
        name: "주진",
        description: "",
        job: "의사",
        gender: "FEMALE",
        ageGroup: "YOUNG",
        looks: [{ id: "look1aaaaaaaaaaaaaaaa" }, { id: "x" }],
      }),
    });
    const meta = await characterMetadata(CHAR_ID);
    expect(meta.title).toBe("주진 (의사) 캐릭터");
    expect(meta.description).toContain("모습 2가지");
    expect(meta.alternates?.canonical).toBe(`/characters/${CHAR_ID}`);
    expect(meta.openGraph).toMatchObject({
      images: [{ url: "/api/images/looks/look1aaaaaaaaaaaaaaaa" }],
    });
  });

  it("모습이 없는 캐릭터는 기본 공유 그림을 쓰고, 없는 캐릭터는 검색에서 뺀다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/characters/${CHAR_ID}`]: json({
        id: CHAR_ID,
        name: "정은윤",
        description: "",
        job: null,
        gender: null,
        ageGroup: null,
        looks: [],
      }),
    });
    const meta = await characterMetadata(CHAR_ID);
    expect(meta.title).toBe("정은윤 캐릭터");
    expect(meta.openGraph).toMatchObject({ images: [{ url: "/og.png" }] });
    expect((await characterMetadata("bad")).robots).toMatchObject({
      index: false,
    });
  });

  it("배경음은 제목과 설명을 넣고, 없으면 검색에서 뺀다", async () => {
    mockFetch({
      [`GET ${GW}/api/v1/sounds/${SOUND_ID}`]: json({
        sound: { id: SOUND_ID, title: "아이들 떠드는 소리", description: "" },
        similar: [],
      }),
    });
    const meta = await soundMetadata(SOUND_ID);
    expect(meta.title).toBe("아이들 떠드는 소리 배경음");
    expect(meta.description).toContain("라이브 모드");
    expect(meta.alternates?.canonical).toBe(`/sounds/${SOUND_ID}`);
    mockFetch({});
    expect((await soundMetadata(SOUND_ID)).robots).toMatchObject({
      index: false,
    });
  });
});

describe("사이트맵", () => {
  it("고정 화면, 전체 공개 게시물, 올린 사람, 캐릭터, 배경음을 넣고 목록은 커서로 끝까지 읽는다", async () => {
    const calls = mockFetch({
      [`GET ${GW}/api/v1/feed?size=50&cursor=c2`]: json({
        items: [
          post({
            postId: "p2xxxxxxxxxxxxxxxxxxx",
            publishedAt: "2026-11-11T00:00:00Z",
          }),
          post({ postId: "p3xxxxxxxxxxxxxxxxxxx", visibility: "FOLLOWERS" }),
        ],
        nextCursor: null,
      }),
      [`GET ${GW}/api/v1/feed?size=50`]: json({
        items: [post()],
        nextCursor: "c2",
      }),
      [`GET ${GW}/api/v1/characters?size=50`]: json({
        items: [{ id: CHAR_ID }],
        nextCursor: null,
      }),
      [`GET ${GW}/api/v1/users?ids=`]: json({ items: [user] }),
    });
    const urls = (await sitemapEntries()).map((e) => e.url);
    expect(urls).toEqual([
      `${SITE}/`,
      `${SITE}/about`,
      `${SITE}/characters`,
      `${SITE}/sounds`,
      `${SITE}/voices`,
      `${SITE}/posts/${POST_ID}`,
      `${SITE}/posts/p2xxxxxxxxxxxxxxxxxxx`,
      `${SITE}/@%EB%A7%88%EB%A5%B4%EC%BD%94`,
      `${SITE}/characters/${CHAR_ID}`,
    ]);
    const entries = await sitemapEntries();
    expect(entries.find((e) => e.url.includes("/@"))?.lastModified).toBe(
      "2026-11-11T00:00:00Z",
    );
    expect(calls.some((c) => c.url.includes("/sounds?size=50"))).toBe(true);
  });
});
