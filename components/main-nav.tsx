"use client";

import {
  AudioLines,
  BookImage,
  Home,
  LogIn,
  Mic,
  User as UserIcon,
  Users,
} from "lucide-react";
import Link from "next/link";

import { GitHubIconLink } from "@/components/github-link";
import { Logo } from "@/components/logo";
import { useViewer } from "@/lib/use-me";
import { cn } from "@/lib/utils";

export type Tab =
  "feed" | "create" | "inbox" | "characters" | "sounds" | "profile";

type TabItem = {
  id: Tab | "login";
  href: string;
  label: string;
  icon: typeof Home;
};

const CHARACTERS: TabItem = {
  id: "characters",
  href: "/characters",
  label: "캐릭터",
  icon: Users,
};
const SOUNDS: TabItem = {
  id: "sounds",
  href: "/sounds",
  label: "배경음",
  icon: AudioLines,
};

/** 로그인한 사람의 메뉴. 배경음은 캐릭터 바로 옆에 둔다. */
const MEMBER_TABS: TabItem[] = [
  { id: "feed", href: "/", label: "피드", icon: Home },
  { id: "create", href: "/record", label: "만들기", icon: Mic },
  { id: "inbox", href: "/comics", label: "스토리", icon: BookImage },
  CHARACTERS,
  SOUNDS,
  { id: "profile", href: "/me", label: "프로필", icon: UserIcon },
];

/** 로그인하지 않은 사람의 메뉴. 로그인 없이 열리는 화면(첫 화면, 캐릭터, 배경음)과 로그인만 둔다. */
const GUEST_TABS: TabItem[] = [
  { id: "feed", href: "/", label: "홈", icon: Home },
  CHARACTERS,
  SOUNDS,
  { id: "login", href: "/login", label: "로그인", icon: LogIn },
];

/** 로그인하지 않은 것이 확인되면 손님 메뉴, 그 밖(확인 중·로그인)에는 회원 메뉴. */
function useTabs(): TabItem[] {
  const viewer = useViewer();
  return viewer.data === null ? GUEST_TABS : MEMBER_TABS;
}

/** 휴대폰 하단 탭. md(768px) 이상에서는 TopNav를 쓴다. */
export function BottomNav({ tab }: { tab: Tab }) {
  const tabs = useTabs();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-[480px]">
        {tabs.map(({ id, href, label, icon: Icon }) => (
          <li key={id} className="flex-1">
            <Link
              href={href}
              aria-current={id === tab ? "page" : undefined}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium",
                id === tab ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden className="size-6" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * PC(md 이상) 상단 메뉴. 본문 폭과 상관없이 화면 위에 한 줄로 둔다. 휴대폰에서는 하단 탭을 쓴다.
 * 왼쪽에 로고와 메뉴, 오른쪽 끝에 주요 행동(만들기·로그인)과 GitHub. 순서는 하단 탭과 같게 두고
 * 주요 행동만 CSS order로 오른쪽 끝에 보낸다.
 */
export function TopNav({ tab }: { tab: Tab }) {
  const tabs = useTabs();
  return (
    <div className="sticky top-0 z-30 hidden border-b border-border bg-background/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-8">
        <Link href="/" aria-label="4cut story 첫 화면" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="상단 메뉴" className="flex-1">
          <ul className="flex items-center gap-1">
            {tabs.map(({ id, href, label, icon: Icon }) => {
              const primary = id === "create" || id === "login";
              const current = id === tab;
              return (
                <li key={id} className={cn(primary && "order-last ml-auto")}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-1.5 rounded-lg px-3 text-[15px] font-medium transition-colors",
                      primary
                        ? "bg-primary px-4 text-primary-foreground hover:bg-primary/90"
                        : current
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {primary && <Icon aria-hidden className="size-4" />}
                    {label}
                    {current && !primary && (
                      <span
                        aria-hidden
                        className="absolute inset-x-3 -bottom-3 h-0.5 rounded-full bg-foreground"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <GitHubIconLink className="-mr-2 -ml-6" />
      </div>
    </div>
  );
}
