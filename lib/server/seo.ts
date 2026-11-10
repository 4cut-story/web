// 서버(페이지 메타데이터·sitemap)에서만 import 한다.
import type { Metadata, MetadataRoute } from "next";
import { cache } from "react";

import { displayName, userPath } from "@/lib/api";
import {
  absoluteUrl,
  excerpt,
  NOINDEX,
  openGraph,
  pageMetadata,
  SITE_NAME,
  SITE_URL,
  twitterCard,
} from "@/lib/seo";
import type {
  CharacterDetail,
  Page,
  Post,
  SoundDetail,
  User,
} from "@/lib/types";

import { callGateway } from "./gateway";
import { isPublicId } from "./ids";

/**
 * 로그인하지 않은 사람(검색 로봇)으로 게이트웨이를 부른다. 로그인 없이 볼 수 있는 것만 오고, 아니면 null.
 * 메타데이터가 실패해도 화면은 그대로 나와야 해서 오류는 삼킨다.
 */
async function getPublic<T>(path: string): Promise<T | null> {
  try {
    const { response } = await callGateway(`/api/v1${path}`, {}, null);
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

function byId<T>(path: (id: string) => string) {
  return cache((id: string) =>
    isPublicId(id) ? getPublic<T>(path(id)) : Promise.resolve(null),
  );
}

/** 같은 요청 안에서 메타데이터와 구조화 데이터가 한 번만 부르게 묶는다. */
export const loadPost = byId<Post>((id) => `/posts/${id}`);
const loadUser = byId<User>((id) => `/users/${id}`);
const loadCharacter = byId<CharacterDetail>((id) => `/characters/${id}`);
const loadSound = byId<SoundDetail>((id) => `/sounds/${id}`);
export const lookupUser = cache((nickname: string) =>
  getPublic<User>(`/users/lookup?nickname=${encodeURIComponent(nickname)}`),
);

/** 전체 공개 게시물만 검색에 올린다. 팔로워 공개·삭제된 게시물은 로그인 없이 안 보이니 null. */
async function publicPost(id: string): Promise<Post | null> {
  const post = await loadPost(id);
  return post?.visibility === "PUBLIC" ? post : null;
}

function postTitle(post: Post): string {
  return post.title?.trim() || "4컷 만화";
}

export async function postMetadata(id: string): Promise<Metadata> {
  const post = await publicPost(id);
  if (!post) {
    return { title: "게시물", robots: NOINDEX };
  }
  const author = await loadUser(post.authorId);
  const title = postTitle(post);
  const description =
    excerpt(post.summary) ||
    excerpt(post.caption) ||
    `${displayName(author) ?? "누군가"}님이 대화로 만든 4컷 만화예요.`;
  const path = `/posts/${post.postId}`;
  const image = {
    url: `/api/images/posts/${post.postId}?size=thumb`,
    alt: `${title} 첫 컷`,
  };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: openGraph({
      type: "article",
      url: path,
      title,
      description,
      publishedTime: post.publishedAt,
      authors: author ? [absoluteUrl(userPath(author.nickname))] : undefined,
      images: [image],
    }),
    twitter: twitterCard({
      card: "summary",
      title,
      description,
      images: [image],
    }),
  };
}

/** 게시물 구조화 데이터(SocialMediaPosting). 공개 게시물이 아니면 null. */
export async function postJsonLd(id: string): Promise<object | null> {
  const post = await publicPost(id);
  if (!post) {
    return null;
  }
  const author = await loadUser(post.authorId);
  const url = absoluteUrl(`/posts/${post.postId}`);
  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "@id": url,
    url,
    headline: postTitle(post),
    text: excerpt(post.summary ?? post.caption, 500) || undefined,
    image: absoluteUrl(`/api/images/posts/${post.postId}`),
    thumbnailUrl: absoluteUrl(`/api/images/posts/${post.postId}?size=thumb`),
    datePublished: post.publishedAt,
    inLanguage: "ko-KR",
    author: author
      ? {
          "@type": "Person",
          name: displayName(author),
          url: absoluteUrl(userPath(author.nickname)),
        }
      : undefined,
    interactionStatistic: [
      counter("LikeAction", post.likeCount),
      counter("CommentAction", post.commentCount),
    ],
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/` },
  };
}

function counter(type: string, count: number): object {
  return {
    "@type": "InteractionCounter",
    interactionType: `https://schema.org/${type}`,
    userInteractionCount: count,
  };
}

export async function userMetadata(nickname: string): Promise<Metadata> {
  const user = await lookupUser(nickname);
  if (!user) {
    return { title: "사용자", robots: NOINDEX };
  }
  const path = userPath(user.nickname);
  const name = displayName(user);
  const title = `${name}님의 4컷`;
  const description = `${name}님이 대화로 만들어 올린 4컷 만화를 모아 봤어요.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: openGraph({ type: "profile", url: path, title, description }),
    twitter: twitterCard({ title, description }),
  };
}

/** 사용자 페이지 구조화 데이터(ProfilePage). */
export async function userJsonLd(nickname: string): Promise<object | null> {
  const user = await lookupUser(nickname);
  if (!user) {
    return null;
  }
  const url = absoluteUrl(userPath(user.nickname));
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    dateCreated: user.joinedAt,
    mainEntity: {
      "@type": "Person",
      name: displayName(user),
      url,
      image: user.avatarUrl ?? undefined,
    },
  };
}

/** /users/아이디는 /@닉네임과 같은 화면이라 대표 주소를 /@닉네임으로 둔다. */
export async function profileMetadata(userId: string): Promise<Metadata> {
  const user = await loadUser(userId);
  if (!user) {
    return { title: "프로필", robots: NOINDEX };
  }
  return {
    title: `${displayName(user)}님의 4컷`,
    alternates: { canonical: userPath(user.nickname) },
  };
}

export async function characterMetadata(id: string): Promise<Metadata> {
  const character = await loadCharacter(id);
  if (!character) {
    return { title: "캐릭터", robots: NOINDEX };
  }
  const path = `/characters/${character.id}`;
  const title = character.job
    ? `${character.name} (${character.job}) 캐릭터`
    : `${character.name} 캐릭터`;
  const description = `4cut story 만화에 나오는 캐릭터 ${character.name}${
    character.job ? `(${character.job})` : ""
  }의 모습 ${character.looks.length}가지를 그림체별로 볼 수 있어요.`;
  const cover = character.looks[0];
  if (!cover) {
    return pageMetadata(title, description, path);
  }
  const images = [
    { url: `/api/images/looks/${cover.id}`, alt: `${character.name} 모습` },
  ];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: openGraph({ url: path, title, description, images }),
    twitter: twitterCard({ card: "summary", title, description, images }),
  };
}

export async function soundMetadata(id: string): Promise<Metadata> {
  const detail = await loadSound(id);
  if (!detail) {
    return { title: "배경음", robots: NOINDEX };
  }
  const { sound } = detail;
  const path = `/sounds/${sound.id}`;
  const title = `${sound.title} 배경음`;
  const description =
    excerpt(sound.description) || "4cut story 라이브 모드에 쓰는 배경음이에요.";
  return pageMetadata(title, description, path);
}

/** 로그인 없이 볼 수 있는 고정 화면. */
const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
  { url: `${SITE_URL}/about`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${SITE_URL}/characters`, changeFrequency: "daily", priority: 0.6 },
  { url: `${SITE_URL}/sounds`, changeFrequency: "weekly", priority: 0.5 },
];

/** 목록 하나에서 읽는 최대 쪽 수(50개씩). 사이트맵 한 파일은 5만 개까지라 넉넉하다. */
const MAX_PAGES = 200;

/** 커서 목록을 끝까지(또는 MAX_PAGES까지) 읽는다. 중간에 실패하면 거기까지만 쓴다. */
async function readAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const query: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const page: Page<T> | null = await getPublic<Page<T>>(
      `${path}${path.includes("?") ? "&" : "?"}size=50${query}`,
    );
    if (!page) {
      break;
    }
    items.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) {
      break;
    }
  }
  return items;
}

/**
 * 사이트맵: 고정 화면, 전체 공개 게시물(로그인 없이 보는 피드), 게시물을 올린 사용자 페이지, 캐릭터, 배경음.
 * 만화 원본·대화·내 화면처럼 로그인해야 보이는 주소는 넣지 않는다.
 */
export async function sitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const [posts, characters, sounds] = await Promise.all([
    readAll<Post>("/feed"),
    readAll<{ id: string }>("/characters"),
    readAll<{ id: string }>("/sounds"),
  ]);
  const publicPosts = posts.filter((p) => p.visibility === "PUBLIC");
  const authors = await loadAuthors([
    ...new Set(publicPosts.map((p) => p.authorId)),
  ]);
  const latest = new Map<string, string>();
  for (const p of publicPosts) {
    if ((latest.get(p.authorId) ?? "") < p.publishedAt) {
      latest.set(p.authorId, p.publishedAt);
    }
  }
  return [
    ...STATIC_PAGES,
    ...publicPosts.map((p) => ({
      url: absoluteUrl(`/posts/${p.postId}`),
      lastModified: p.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: [absoluteUrl(`/api/images/posts/${p.postId}`)],
    })),
    ...authors.map((u) => ({
      url: absoluteUrl(userPath(u.nickname)),
      lastModified: latest.get(u.id),
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...characters.map((c) => ({
      url: absoluteUrl(`/characters/${c.id}`),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...sounds.map((s) => ({
      url: absoluteUrl(`/sounds/${s.id}`),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}

/** 사용자 여러 명을 50명씩 나눠 한 번에 읽는다. */
async function loadAuthors(ids: string[]): Promise<User[]> {
  const users: User[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = await getPublic<{ items: User[] }>(
      `/users?ids=${ids.slice(i, i + 50).join(",")}`,
    );
    users.push(...(batch?.items ?? []));
  }
  return users;
}
