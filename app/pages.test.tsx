import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ArticlePage from "./article/page";
import CharacterPage from "./characters/[id]/page";
import CharactersPage from "./characters/page";
import ComicPage from "./comics/[id]/page";
import InboxPage from "./comics/page";
import ProgressPage from "./conversations/[id]/page";
import LoginPage from "./login/page";
import MePage from "./me/page";
import FeedPage from "./page";
import PostPage from "./posts/[id]/page";
import RecordPage from "./record/page";
import RssPage from "./rss/page";
import SamplesPage from "./record/samples/page";
import SoundPage from "./sounds/[id]/page";
import SoundsPage from "./sounds/page";
import UserPage from "./u/[nickname]/page";
import ProfilePage from "./users/[id]/page";
import { Awaited, Resolve } from "@/components/awaited";
import { router } from "@/test/screen";
import { mockFetch } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
});

type AwaitedProps = {
  value: Promise<unknown>;
  render: (v: unknown) => ReactNode;
};

/** 페이지가 돌려준 Awaited 요소의 값을 풀어 화면을 그린다. 구조화 데이터가 함께 있으면(Fragment) 첫 요소가 화면이다. */
async function renderAwaited(page: ReactElement) {
  const children = (page.props as { children?: ReactNode }).children;
  const element = (
    Array.isArray(children) ? children[0] : page
  ) as ReactElement;
  const props = element.props as AwaitedProps;
  expect(isValidElement(Awaited(props as never))).toBe(true);
  const resolved = await Resolve(props);
  if (!isValidElement(resolved)) {
    throw new Error("화면 요소가 아님");
  }
  render(resolved);
}

describe("페이지 연결", () => {
  it("정적 페이지는 각 화면을 그린다", () => {
    mockFetch({});
    const pages: [() => ReactElement, string][] = [
      // 첫 화면은 로그인 확인 전이라 서비스 이름만 보인다
      [FeedPage, "4cut story"],
      [InboxPage, "스토리"],
      [RecordPage, "만들기"],
      [ArticlePage, "기사로 만들기"],
      [RssPage, "RSS 구독"],
      [SamplesPage, "샘플로 만들어 보기"],
      [MePage, "프로필"],
    ];
    for (const [Page, title] of pages) {
      const { unmount } = render(<Page />);
      expect(
        screen.getByRole("heading", { level: 1, name: title }),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("경로 값을 풀어 화면에 넘긴다", async () => {
    mockFetch({});
    const params = Promise.resolve({ id: "x1" });
    const cases: [ReactElement, string][] = [
      [ComicPage({ params } as never), "4컷"],
      [ProgressPage({ params } as never), "4컷 만드는 중"],
      [PostPage({ params } as never), "게시물"],
      [ProfilePage({ params } as never), "프로필"],
      [
        CharactersPage({
          searchParams: Promise.resolve({ theme: "WUXIA" }),
        } as never),
        "캐릭터",
      ],
      [
        CharacterPage({
          params,
          searchParams: Promise.resolve({ theme: "JOSEON" }),
        } as never),
        "캐릭터",
      ],
      [
        CharacterPage({ params, searchParams: Promise.resolve({}) } as never),
        "캐릭터",
      ],
      [
        SoundsPage({
          searchParams: Promise.resolve({ kind: "MUSIC", mood: "SAD" }),
        } as never),
        "배경음",
      ],
      [SoundPage({ params } as never), "배경음"],
      [
        UserPage({
          params: Promise.resolve({ nickname: "%EB%A7%88%EB%A5%B4%EC%BD%94" }),
        } as never),
        "마르코",
      ],
    ];
    for (const [element, title] of cases) {
      await renderAwaited(element);
      expect(
        screen.getByRole("heading", { level: 1, name: title }),
      ).toBeInTheDocument();
      document.body.innerHTML = "";
    }
  });

  it("로그인 화면은 error 쿼리를 넘긴다", async () => {
    mockFetch({});
    await renderAwaited(
      LoginPage({
        searchParams: Promise.resolve({ error: "LOGIN_FAILED" }),
      } as never),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    document.body.innerHTML = "";
    await renderAwaited(
      LoginPage({
        searchParams: Promise.resolve({ error: ["a", "b"] }),
      } as never),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
