import {
  ArrowDown,
  ArrowRight,
  Cloud,
  Cpu,
  Database,
  Gauge,
  type LucideIcon,
  Server,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { AppShell, HOME } from "@/components/app-shell";
import { GitHubMark, GITHUB_URL } from "@/components/github-link";
import { Button } from "@/components/ui/button";
import {
  HARDWARE,
  MODELS,
  PIPELINE,
  STACK,
  STATS,
  TUNINGS,
  VRAM_BUNDLES,
  VRAM_TOTAL_GB,
  type Where,
} from "@/lib/about";
import { cn } from "@/lib/utils";

/** 실행 위치마다 붙이는 아이콘. */
const WHERE_ICON: Record<Where, LucideIcon> = {
  "GPU PC": Cpu,
  "클라우드 API": Cloud,
  클러스터: Server,
  "임베딩 서버": Database,
};

/**
 * 서비스 소개(포트폴리오) 페이지: 한눈에 보는 숫자, 전체 아키텍처, 생성 흐름, 하드웨어와 VRAM 배분,
 * AI 모델, 튜닝 기록, 기술 스택. 로그인 없이 볼 수 있다. 값은 lib/about.ts에 모아 둔다.
 */
export function AboutScreen() {
  return (
    <AppShell title="서비스 소개" back={HOME} width="wide">
      <div className="flex flex-col gap-16 pb-6 md:gap-24">
        <Intro />
        <Architecture />
        <Pipeline />
        <HardwareSection />
        <Models />
        <Tunings />
        <StackSection />
        <Outro />
      </div>
    </AppShell>
  );
}

function SectionTitle({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-accent-strong">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-bold md:text-3xl">
        {title}
      </h2>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-8">
      <SectionTitle
        id={id}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      {children}
    </section>
  );
}

function Intro() {
  return (
    <div className="flex flex-col gap-10 pt-2 md:pt-6">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent-strong">
          <Sparkles aria-hidden className="size-4" />
          포트폴리오 · 기술 소개
        </span>
        <h2 className="text-[2rem] leading-[1.2] font-bold md:text-5xl md:leading-[1.15]">
          녹음 한 번이 <span className="text-accent">4컷 만화</span>가
          <br className="hidden md:block" /> 되기까지
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          4cut story는 친구와 나눈 대화를 받아 적고, 가장 재미있는 순간을 골라
          네 컷으로 그려 주는 서비스예요. 마이크로서비스 다섯 개가 쿠버네티스
          위에서 흐름을 관리하고, RTX 5060 Ti 16GB 한 장짜리 GPU PC가 음성
          인식과 그림을 맡아요. 어떤 구조로 만들었고 어디를 튜닝했는지
          정리했어요.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {STATS.map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-col gap-1 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[4px_4px_0_0_var(--color-foreground)] md:p-5"
          >
            <dt className="order-2 text-sm text-muted-foreground">{label}</dt>
            <dd className="order-1 text-2xl font-bold tabular-nums md:text-3xl">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Box({
  title,
  detail,
  strong = false,
}: {
  title: string;
  detail: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl px-4 py-3",
        strong ? "bg-foreground text-background" : "bg-background",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p
        className={cn(
          "text-xs leading-relaxed",
          strong ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {detail}
      </p>
    </div>
  );
}

function Down({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground">
      <ArrowDown aria-hidden className="size-4" />
      {label}
    </div>
  );
}

function Architecture() {
  return (
    <Section
      id="architecture"
      eyebrow="ARCHITECTURE"
      title="전체 아키텍처"
      description="외부에 열린 것은 web 하나예요. GPU PC는 클러스터가 부르지 않고, 워커가 먼저 작업을 가져가요(pull). 그래서 GPU PC에는 들어오는 포트가 없어요."
    >
      <figure
        aria-label="전체 아키텍처 그림"
        className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"
      >
        <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4 md:p-5">
          <p className="text-sm font-semibold">쿠버네티스 클러스터</p>
          <Box
            title="브라우저 (휴대폰 · PC)"
            detail="HTTPS, 암호화 쿠키 세션"
          />
          <Down label="Ingress (Nginx)" />
          <Box
            strong
            title="web · Next.js"
            detail="SSR 화면 + BFF. 쿠키 세션을 JWT로 바꿔 게이트웨이를 불러요. 이미지는 공개 범위를 확인한 뒤 중계해요."
          />
          <Down label="Bearer JWT" />
          <Box
            strong
            title="api-gateway · Spring Cloud Gateway"
            detail="JWT 검증, 라우팅, 외부에서 온 사용자 헤더 제거 후 재주입"
          />
          <Down label="REST + OpenAPI 계약" />
          <div className="grid gap-2 sm:grid-cols-3">
            <Box
              title="auth-service"
              detail="GitHub·Google 로그인, JWT 발급, JWKS"
            />
            <Box
              title="conversation-service"
              detail="생성 흐름(stt · scenario · comic · character 모듈), GPU 작업 대기열"
            />
            <Box
              title="content-service"
              detail="만화함, 게시, 피드, 좋아요·댓글, 팔로우"
            />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Box
              title="PostgreSQL + pgvector"
              detail="서비스별 스키마·계정, Flyway, 캐릭터 설명 임베딩 HNSW 인덱스"
            />
            <Box
              title="MinIO (S3 API)"
              detail="녹음 조각·중간 결과·완성 4컷. 사전 서명 주소로만 주고받아요"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border-2 border-foreground p-4 md:p-5">
            <p className="text-sm font-semibold">GPU PC</p>
            <Box
              strong
              title="model-runtime · Python 워커"
              detail="작업 가져가기 → 30초 heartbeat → 결과 보고. WhisperX, SDXL을 직접 실행해요"
            />
            <Box
              title="Ollama (localhost만)"
              detail="Qwen3 8B. 워커만 불러요"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              한 번에 작업 하나, 모델 묶음 하나만 VRAM에 둬요. 지금 올려 둔
              모델과 같은 종류 작업을 먼저 받아 전환을 줄여요.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4 md:p-5">
            <p className="text-sm font-semibold">외부 모델 API</p>
            <Box title="Claude API" detail="장면 고르기·콘티 1순위" />
            <Box title="Gemini API" detail="전사 보정, 콘티 2순위" />
            <Box title="임베딩 서버" detail="BGE-M3, OpenAI 호환 API" />
          </div>
        </div>
        <figcaption className="text-sm text-muted-foreground lg:col-span-2">
          main에 머지되면 GitHub Actions가 이미지를 GHCR에 올리고 deploy 레포의
          태그를 커밋해, Argo CD가 자동으로 동기화해요. 사람이 kubectl을 직접
          치지 않아요.
        </figcaption>
      </figure>
    </Section>
  );
}

function WhereBadge({ where }: { where: Where }) {
  const Icon = WHERE_ICON[where];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Icon aria-hidden className="size-3.5" />
      {where}
    </span>
  );
}

function Pipeline() {
  return (
    <Section
      id="pipeline"
      eyebrow="PIPELINE"
      title="생성 흐름"
      description="사용자는 녹음만 해요. 나머지 여덟 단계는 conversation-service가 차례로 돌리고, 실패한 단계부터 자동으로 다시 시도해요."
    >
      <ol className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {PIPELINE.map(({ title, description, models, where }, i) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-2xl bg-muted p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <WhereBadge where={where} />
            </div>
            <p className="text-base font-semibold">{title}</p>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            {models.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="쓰는 모델">
                {models.map((m) => (
                  <li
                    key={m}
                    className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-strong"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

function HardwareSection() {
  return (
    <Section
      id="hardware"
      eyebrow="HARDWARE"
      title="하드웨어 환경"
      description="유료 GPU 서버 없이 소비자용 GPU 한 장으로 돌려요. 세 모델 묶음을 한꺼번에 올리면 16GB를 넘기 때문에, 단계마다 한 묶음만 올리고 내려요."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {HARDWARE.map(({ title, specs }) => (
          <div
            key={title}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5 md:p-6"
          >
            <p className="text-base font-semibold">{title}</p>
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
              {specs.map((s) => (
                <li key={s} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                  />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-muted p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Gauge aria-hidden className="size-5 text-accent" />
          <p className="text-base font-semibold">
            VRAM 배분 (RTX 5060 Ti {VRAM_TOTAL_GB}GB)
          </p>
        </div>
        <ul className="flex flex-col gap-4">
          {VRAM_BUNDLES.map(({ name, gb, detail }) => (
            <li key={name} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">{name}</span>
                <span className="text-muted-foreground tabular-nums">
                  약 {gb}GB / {VRAM_TOTAL_GB}GB
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${(gb / VRAM_TOTAL_GB) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">
          설계 단계 추정치예요. 화면 출력과 CUDA 컨텍스트 몫으로 약 2GB를 남기고
          한 묶음이 14GB를 넘지 않게 정했어요. 모델을 올리기 전에 남은 VRAM을
          확인하고, 모자라면 작업을 대기열로 돌려보내요.
        </p>
      </div>
    </Section>
  );
}

function Models() {
  return (
    <Section
      id="models"
      eyebrow="AI MODELS"
      title="사용한 AI 모델"
      description="모델 하나로 다 하지 않고, 단계마다 잘하는 모델을 골라 이어 붙였어요. 콘티는 클라우드 모델을 먼저 쓰고, 막히면 GPU PC의 로컬 모델이 받아요."
    >
      <ul className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {MODELS.map(({ name, role, size, where, note }) => (
          <li
            key={name}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5"
          >
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold">{name}</p>
              <p className="text-sm font-medium text-accent-strong">{role}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">크기</dt>
              <dd>{size}</dd>
              <dt className="text-muted-foreground">실행</dt>
              <dd>{where}</dd>
            </dl>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {note}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 rounded-2xl bg-accent/10 p-5 md:p-6">
        <p className="text-base font-semibold">캐릭터 DB 42,000장</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          대화 속 사람을 대신할 캐릭터 1,000명을 테마 7가지(일상, 동물, 수채화,
          그림책, 신문 만화, 조선, 무협)와 표정 6가지로 준비했어요. Claude와
          함께 짠 SVG 생성 코드로 1,000 × 7 × 6 = 42,000장을 그려 IP-Adapter
          참조 그림으로 써요. 같은 캐릭터가 일상에서는 의사 가운, 조선에서는
          의녀 한복을 입어요.
        </p>
        <Link
          href="/characters"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          캐릭터 갤러리 보기
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </Section>
  );
}

function Tunings() {
  return (
    <Section
      id="tuning"
      eyebrow="TUNING"
      title="튜닝한 부분"
      description="GPU PC와 운영 DB에서 직접 재고 고친 것들이에요. 문제, 고친 방법, 결과 순서로 정리했어요."
    >
      <ul className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {TUNINGS.map(({ title, problem, fix, result }) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-2xl bg-muted p-5"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-background">
                <Wrench aria-hidden className="size-4 text-accent" />
              </span>
              <p className="text-base font-semibold">{title}</p>
            </div>
            <dl className="flex flex-1 flex-col gap-2 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold">문제</dt>
                <dd className="text-muted-foreground">{problem}</dd>
              </div>
              <div>
                <dt className="font-semibold">고친 방법</dt>
                <dd className="text-muted-foreground">{fix}</dd>
              </div>
            </dl>
            <p className="rounded-lg bg-background px-3 py-2 text-sm font-semibold">
              {result}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function StackSection() {
  return (
    <Section
      id="stack"
      eyebrow="STACK"
      title="기술 스택과 품질 기준"
      description="모든 레포는 PR마다 정적 분석과 테스트 커버리지 80%를 통과해야 머지돼요. 서비스 간 통신은 OpenAPI 계약을 먼저 쓰고 구현해요."
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STACK.map(({ group, items }) => (
          <div
            key={group}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5"
          >
            <dt className="text-sm font-semibold">{group}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span
                  key={item}
                  className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                >
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function Outro() {
  return (
    <div className="flex flex-col items-start gap-5 rounded-2xl border-2 border-foreground p-6 shadow-[6px_6px_0_0_var(--color-foreground)] md:p-8">
      <p className="text-xl font-bold md:text-2xl">
        코드는 모두 GitHub에 공개돼 있어요
      </p>
      <p className="text-base text-muted-foreground">
        서비스 9개 레포, 설계 문서, 스펙, 튜닝 기록을 커밋 단위로 볼 수 있어요.
      </p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild size="lg">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <GitHubMark className="size-4" />
            GitHub에서 소스 보기
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            4컷 만들러 가기
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
