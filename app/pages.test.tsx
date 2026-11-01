import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ComicPage from "./comics/[id]/page";
import InboxPage from "./comics/page";
import ProgressPage from "./conversations/[id]/page";
import LoginPage from "./login/page";
import MePage from "./me/page";
import FeedPage from "./page";
import PostPage from "./posts/[id]/page";
import RecordPage from "./record/page";
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

/** 페이지가 돌려준 Awaited 요소의 값을 풀어 화면을 그린다. */
async function renderAwaited(element: ReactElement) {
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
      [InboxPage, "만화함"],
      [RecordPage, "만들기"],
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
      [ComicPage({ params } as never), "만화"],
      [ProgressPage({ params } as never), "만화 만드는 중"],
      [PostPage({ params } as never), "게시물"],
      [ProfilePage({ params } as never), "프로필"],
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
