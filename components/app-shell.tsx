import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/github-link";
import { Logo } from "@/components/logo";
import { BottomNav, TopNav, type Tab } from "@/components/main-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type { Tab };

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
  brand = false,
  tab,
  back,
  actions,
  width = "narrow",
  children,
}: {
  title: string;
  /** 제목 대신 로고를 보인다(첫 화면). 접근성 이름은 "4cut story"로 같다. */
  brand?: boolean;
  tab?: Tab;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  width?: ShellWidth;
  children: React.ReactNode;
}) {
  // PC 위 메뉴는 둘러보는 화면(넓은 틀이나 탭이 있는 화면)에 늘 둔다. 녹음·진행처럼 한 줄 흐름(narrow)인 화면만 뺀다.
  const topNav = tab !== undefined || width !== "narrow";
  return (
    <>
      {topNav && <TopNav tab={tab} />}
      <div className={cn("mx-auto flex w-full flex-1 flex-col", WIDTH[width])}>
        <header
          className={cn(
            "flex h-14 items-center justify-between gap-4 px-5 md:h-16 md:px-8",
            // PC에서는 위 메뉴가 로고를 보이니, 로고만 있는 머리는 숨긴다(로고가 두 번 나오지 않게).
            brand && topNav && "md:hidden",
          )}
        >
          <div className="flex min-w-0 items-center gap-1">
            {back && (
              <Link
                href={back.href}
                aria-label={back.label}
                className={cn(
                  "-ml-2 flex size-10 shrink-0 items-center justify-center",
                  // 첫 화면으로 가는 ‹는 PC 위 메뉴의 로고가 대신한다
                  topNav && back.href === "/" && "md:hidden",
                )}
              >
                <ChevronLeft aria-hidden className="size-6" />
              </Link>
            )}
            <h1 className="truncate text-lg font-semibold">
              {brand ? <Logo /> : title}
            </h1>
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </header>
        <main
          className={cn(
            "flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-12",
            brand && topNav && "md:pt-10",
          )}
        >
          {children}
        </main>
        {tab && <BottomNav tab={tab} />}
      </div>
      <SiteFooter
        className={
          tab
            ? "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
            : undefined
        }
      />
    </>
  );
}

/** 첫 화면으로 돌아가는 ‹ 링크. */
export const HOME = { href: "/", label: "첫 화면으로" };

/** 로그인하지 않은 사람에게 헤더 오른쪽에 두는 로그인 버튼. PC에서는 위 메뉴의 로그인이 대신한다. */
export function LoginButton() {
  return (
    <Button asChild size="sm" className="md:hidden">
      <Link href="/login">로그인</Link>
    </Button>
  );
}
