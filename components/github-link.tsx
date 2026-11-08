import { FlaskConical, Sparkles } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** 이 서비스의 소스 코드가 있는 GitHub 조직. */
export const GITHUB_URL = "https://github.com/4cut-story";

/** 바닥글 저작권 연도. 빌드할 때 화면을 미리 그려 두므로 new Date()를 쓰지 않는다. */
export const COPYRIGHT_YEAR = 2026;

/** GitHub 마크 (lucide에는 상표 아이콘이 없어 직접 그린다). */
export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("size-5", className)}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/** 상단 메뉴 오른쪽에 두는 GitHub 아이콘 링크. */
export function GitHubIconLink({ className }: { className?: string }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub에서 소스 코드 보기"
      title="GitHub에서 소스 코드 보기"
      className={cn(
        "flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <GitHubMark />
    </a>
  );
}

/**
 * 모든 화면 아래의 바닥글: 서비스 소개, 소개 페이지(/about)·그림 모델 비교(/lab)와 GitHub 링크, 저작권, 기술 스택.
 * 본문 폭과 상관없이 화면 끝까지 깔고, 안쪽은 상단 메뉴와 같은 폭(1152px)에 맞춘다.
 * 휴대폰은 한 줄씩 쌓고 GitHub 버튼을 꽉 채우며, 하단 탭이 있으면 className으로 아래를 띄운다.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "w-full border-t border-border bg-muted/40 text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-foreground">
              4cut story
            </p>
            <p>녹음한 대화를 AI가 4컷 만화로 그려 주는 서비스</p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-fit md:flex-row">
            <Link
              href="/about"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:w-fit"
            >
              <Sparkles aria-hidden className="size-4" />
              서비스 소개 · 기술 스택
            </Link>
            <Link
              href="/lab"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 font-medium text-foreground transition-colors hover:bg-muted md:w-fit"
            >
              <FlaskConical aria-hidden className="size-4" />
              그림 모델 비교
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 font-medium text-foreground transition-colors hover:bg-muted md:w-fit"
            >
              <GitHubMark className="size-4" />
              GitHub에서 소스 보기
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-1 border-t border-border pt-4 text-xs md:flex-row md:justify-between">
          <p>© {COPYRIGHT_YEAR} 4cut story</p>
          <p>Next.js · Spring Boot · Spring AI · Kubernetes</p>
        </div>
      </div>
    </footer>
  );
}
