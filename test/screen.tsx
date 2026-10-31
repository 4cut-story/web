import { vi } from "vitest";

/** 화면 테스트 공통: next/navigation 라우터를 가짜로 바꾼다. */
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
}));

export const ME = {
  id: "me",
  nickname: "마르코",
  avatarUrl: null,
  providers: ["GITHUB"],
};
export const OTHER = {
  id: "u2",
  nickname: "지수",
  avatarUrl: "https://example.com/a.png",
};

export function post(overrides: Record<string, unknown> = {}) {
  return {
    postId: "p1",
    comicId: "c1",
    authorId: "u2",
    title: "편의점 대소동",
    caption: "오늘 있었던 일",
    visibility: "PUBLIC",
    publishedAt: new Date().toISOString(),
    likeCount: 2,
    commentCount: 1,
    likedByMe: false,
    ...overrides,
  };
}

export function comic(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    conversationId: "v1",
    title: "편의점 대소동",
    language: "ko",
    nameWarnings: [],
    state: "IN_INBOX",
    postId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
