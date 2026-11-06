import {
  BookImage,
  ChevronLeft,
  Home,
  Mic,
  User as UserIcon,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Tab = "feed" | "create" | "inbox" | "characters" | "profile";

const TABS: { id: Tab; href: string; label: string; icon: typeof Home }[] = [
  { id: "feed", href: "/", label: "피드", icon: Home },
  { id: "create", href: "/record", label: "만들기", icon: Mic },
  { id: "inbox", href: "/comics", label: "스토리", icon: BookImage },
  { id: "characters", href: "/characters", label: "캐릭터", icon: Users },
  { id: "profile", href: "/me", label: "프로필", icon: UserIcon },
];

/**
 * 화면 틀: 상단 헤더(56px) + 본문(최대 480px) + 하단 탭(녹음·진행·로그인 화면에서는 숨김).
 * back이 있으면 제목 앞에 ‹ 링크를 둔다(하단 탭이 없는 화면에서 나가는 길).
 *
 * 반응형: 휴대폰은 본문 480px + 하단 탭. md(768px) 이상에서는 하단 탭 대신 화면 위에 메뉴 줄을 두고,
 * width에 따라 본문을 넓힌다 — narrow(녹음·진행처럼 한 줄 흐름, 480px 그대로), medium(4컷 상세, 768px),
 * wide(피드·스토리·캐릭터처럼 격자, 1152px).
 */
export type ShellWidth = "narrow" | "medium" | "wide";

const WIDTH: Record<ShellWidth, string> = {
  narrow: "max-w-[480px]",
  medium: "max-w-[480px] md:max-w-3xl",
  wide: "max-w-[480px] md:max-w-6xl",
};

export function AppShell({
  title,
  tab,
  back,
  actions,
  width = "narrow",
  children,
}: {
  title: string;
  tab?: Tab;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  width?: ShellWidth;
  children: React.ReactNode;
}) {
  return (
    <>
      {tab && <TopNav tab={tab} />}
      <div className={cn("mx-auto flex w-full flex-1 flex-col", WIDTH[width])}>
        <header className="flex h-14 items-center justify-between gap-4 px-5 md:h-16 md:px-8">
          <div className="flex min-w-0 items-center gap-1">
            {back && (
              <Link
                href={back.href}
                aria-label={back.label}
                className="-ml-2 flex size-10 shrink-0 items-center justify-center"
              >
                <ChevronLeft aria-hidden className="size-6" />
              </Link>
            )}
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </header>
        <main
          className={cn(
            "flex flex-1 flex-col px-5 md:px-8",
            tab ? "pb-24 md:pb-12" : "md:pb-12",
          )}
        >
          {children}
        </main>
        {tab && (
          <nav
            aria-label="주요 메뉴"
            className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          >
            <ul className="mx-auto flex h-16 max-w-[480px]">
              {TABS.map(({ id, href, label, icon: Icon }) => (
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
        )}
      </div>
    </>
  );
}

/** PC(md 이상) 상단 메뉴. 본문 폭과 상관없이 화면 위에 한 줄로 둔다. 휴대폰에서는 하단 탭을 쓴다. */
function TopNav({ tab }: { tab: Tab }) {
  return (
    <div className="sticky top-0 z-30 hidden border-b border-border bg-background md:block">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-8">
        <Link href="/" aria-label="4cut story 첫 화면">
          <Logo />
        </Link>
        <nav aria-label="상단 메뉴">
          <ul className="flex items-center gap-1">
            {TABS.map(({ id, href, label, icon: Icon }) => (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={id === tab ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
                    id === "create"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : id === tab
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

/** 첫 화면으로 돌아가는 ‹ 링크. */
export const HOME = { href: "/", label: "첫 화면으로" };

/** 로그인하지 않은 사람에게 헤더 오른쪽에 두는 로그인 버튼. */
export function LoginButton() {
  return (
    <Button asChild size="sm">
      <Link href="/login">로그인</Link>
    </Button>
  );
}
