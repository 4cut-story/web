import {
  BookImage,
  ChevronLeft,
  Home,
  Mic,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Tab = "feed" | "create" | "inbox" | "profile";

const TABS: { id: Tab; href: string; label: string; icon: typeof Home }[] = [
  { id: "feed", href: "/", label: "피드", icon: Home },
  { id: "create", href: "/record", label: "만들기", icon: Mic },
  { id: "inbox", href: "/comics", label: "스토리", icon: BookImage },
  { id: "profile", href: "/me", label: "프로필", icon: UserIcon },
];

/**
 * 화면 틀: 상단 헤더(56px) + 본문(최대 480px) + 하단 탭(녹음·진행·로그인 화면에서는 숨김).
 * back이 있으면 제목 앞에 ‹ 링크를 둔다(하단 탭이 없는 화면에서 나가는 길).
 */
export function AppShell({
  title,
  tab,
  back,
  actions,
  children,
}: {
  title: string;
  tab?: Tab;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-5">
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
      <main className={cn("flex flex-1 flex-col px-5", tab && "pb-24")}>
        {children}
      </main>
      {tab && (
        <nav
          aria-label="주요 메뉴"
          className="fixed inset-x-0 bottom-0 bg-background pb-[env(safe-area-inset-bottom)]"
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
