import {
  ArrowRight,
  AudioLines,
  Cpu,
  FlaskConical,
  Heart,
  Images,
  type LucideIcon,
  Mic,
  Newspaper,
  ScanText,
  Share2,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";

import { GitHubMark, GITHUB_URL } from "@/components/github-link";
import { Button } from "@/components/ui/button";
import { imageUrl } from "@/lib/api";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Mic,
    title: "대화를 녹음해요",
    description: "친구, 가족과 나눈 이야기를 녹음하거나 파일로 올려요.",
  },
  {
    icon: ScanText,
    title: "받아 적어요",
    description: "음성을 글로 옮기고 누가 어떤 말을 했는지 나눠요.",
  },
  {
    icon: WandSparkles,
    title: "장면을 골라요",
    description: "AI가 가장 재미있는 순간을 골라 콘티와 대사를 짜요.",
  },
  {
    icon: Images,
    title: "4컷으로 그려요",
    description: "캐릭터를 입혀 네 컷을 그리고 한 장으로 합쳐요.",
  },
];

const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  cta: string;
}[] = [
  {
    icon: Users,
    title: "캐릭터 갤러리",
    description:
      "직업, 나이, 테마별로 준비된 캐릭터가 대화 속 사람을 대신해 등장해요.",
    href: "/characters",
    cta: "캐릭터 보기",
  },
  {
    icon: Share2,
    title: "나만의 페이지",
    description:
      "4cut.java21.net/@닉네임 주소로 내가 올린 4컷을 한곳에 모아 보여 줘요.",
    href: "/me",
    cta: "내 페이지",
  },
  {
    icon: Heart,
    title: "좋아요와 댓글",
    description:
      "전체 공개 또는 팔로워 공개로 올리고, 친구들과 좋아요와 댓글을 나눠요.",
    href: "#feed",
    cta: "4컷 둘러보기",
  },
];

/**
 * 첫 화면 소개(랜딩): 히어로(문구, 시작 버튼, 최근 4컷 네 장을 4컷 틀에), 서비스 소개 페이지 안내,
 * 만드는 과정 네 단계, 특징 세 가지.
 * 이 아래에 피드가 이어진다. 로그인 여부에 따라 시작 버튼만 바뀐다.
 */
export function Landing({
  signedIn,
  posts,
}: {
  signedIn: boolean;
  posts: Post[];
}) {
  return (
    <section
      aria-label="서비스 소개"
      className="flex flex-col gap-14 pb-14 md:gap-20 md:pb-16"
    >
      <Hero signedIn={signedIn} posts={posts.slice(0, 4)} />
      <Callouts />
      <Steps />
      <Features signedIn={signedIn} />
    </section>
  );
}

function Hero({ signedIn, posts }: { signedIn: boolean; posts: Post[] }) {
  return (
    <div className="flex flex-col gap-10 pt-4 md:grid md:grid-cols-[1.1fr_1fr] md:items-center md:gap-16 md:pt-0">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
          <Sparkles aria-hidden className="size-4" />
          AI가 그려 주는 4컷 만화
        </span>
        <h2 className="text-[2rem] leading-[1.25] font-bold tracking-tight md:text-[3.25rem] md:leading-[1.15]">
          우리가 나눈 대화가
          <br />
          <span className="text-accent">4컷 만화</span>가 돼요
        </h2>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
          녹음만 올리면 AI가 대화를 받아 적고, 가장 재미있는 장면을 골라 네
          컷으로 그려 드려요. 오늘 있었던 웃긴 이야기를 만화로 남기고 나눠
          보세요.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {signedIn ? (
            <>
              <Button asChild size="lg">
                <Link href="/record">
                  <Mic aria-hidden />
                  녹음해서 만들기
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/article">
                  <Newspaper aria-hidden />
                  기사로 만들기
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link href="/login">
                무료로 시작하기
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <GitHubMark className="size-4" />
              소스 코드
            </a>
          </Button>
        </div>
      </div>
      <Strip posts={posts} />
    </div>
  );
}

/** 히어로 바로 아래에서 소개·비교 페이지로 이끄는 카드. 얇은 선과 흰 바탕만 쓰고, 누르면 테두리가 짙어진다. */
function Callout({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
  cta,
}: {
  href: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-background p-5 transition-colors hover:border-foreground/40 md:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon aria-hidden className="size-5" />
        </span>
        <p className="text-sm font-semibold text-muted-foreground">{eyebrow}</p>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-lg font-bold">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold">
        {cta}
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

/** 서비스 소개(/about), 그 아래 그림 모델 비교(/lab)로 가는 띠. 기사로 만들기는 로그인한 히어로 버튼, RSS 구독은 내 페이지 버튼으로 들어간다. 배경음은 메뉴에서 캐릭터 옆으로 들어간다. */
function Callouts() {
  return (
    <div className="grid gap-3 md:grid-cols-2 md:gap-4">
      <Callout
        href="/about"
        icon={Cpu}
        eyebrow="서비스 소개"
        title="이 서비스는 어떻게 만들었을까요?"
        description="마이크로서비스 아키텍처, RTX 5060 Ti 16GB 한 장으로 돌리는 AI 모델 9개, 직접 재고 고친 튜닝 기록을 모았어요."
        cta="소개 페이지 보기"
      />
      <Callout
        href="/lab"
        icon={FlaskConical}
        eyebrow="그림 모델 비교"
        title="어떤 그림 모델이 4컷을 더 잘 그릴까요?"
        description="같은 콘티를 여러 그림 모델과 양자화 방식으로 그린 테스트 컷을 점수, 컷당 시간과 함께 나란히 비교해요."
        cta="비교 페이지 보기"
      />
    </div>
  );
}

const PLACEHOLDERS: LucideIcon[] = [AudioLines, ScanText, WandSparkles, Images];

/** 최근 4컷 네 장의 첫 컷을 4컷 틀(2×2)에 담은 그림. 모자라면 단계 아이콘으로 채운다. */
function Strip({ posts }: { posts: Post[] }) {
  return (
    <div aria-hidden className="mx-auto w-full max-w-md md:max-w-none">
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted p-1.5 md:gap-2 md:p-2">
        {PLACEHOLDERS.map((Icon, i) => {
          const post = posts[i];
          return (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-md bg-background"
            >
              {post ? (
                // eslint-disable-next-line @next/next/no-img-element -- BFF 이미지 중계라 next/image 최적화를 쓰지 않는다
                <img
                  src={imageUrl("posts", post.postId, true)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Icon className="size-10" />
                </div>
              )}
              <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-background/90 text-xs font-bold text-foreground tabular-nums">
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-accent-strong">{eyebrow}</p>
      <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">
        {title}
      </h2>
      <p className="text-base text-muted-foreground">{description}</p>
    </div>
  );
}

function Steps() {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="만드는 과정"
        title="녹음 하나로 4컷까지"
        description="올리고 기다리면 돼요. 나머지는 AI가 차례로 해요."
      />
      <ol className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, description }, i) => (
          <li
            key={title}
            className="flex flex-col gap-4 rounded-xl bg-muted p-5 md:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-background">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                0{i + 1}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold">{title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Features({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        eyebrow="할 수 있는 것"
        title="만들고, 모으고, 나눠요"
        description="4컷을 만든 다음에도 할 수 있는 게 많아요."
      />
      <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
        {FEATURES.map(({ icon: Icon, title, description, href, cta }) => (
          <li
            key={title}
            className="flex flex-col gap-4 rounded-xl border border-border p-5 md:p-6"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-base font-semibold">{title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
            <Link
              href={href === "/me" && !signedIn ? "/login" : href}
              className={cn(
                "inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground",
                "underline-offset-4 hover:underline",
              )}
            >
              {cta}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
