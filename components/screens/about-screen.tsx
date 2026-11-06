import {
  ArrowDown,
  ArrowRight,
  Cloud,
  Cpu,
  Database,
  Gauge,
  Lightbulb,
  type LucideIcon,
  Monitor,
  Server,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AppShell, HOME } from "@/components/app-shell";
import { GitHubMark, GITHUB_URL } from "@/components/github-link";
import { AboutExamples } from "@/components/screens/about-examples";
import { Button } from "@/components/ui/button";
import {
  AUTH_FLOW,
  CHANNELS,
  CHARACTER_COUNT,
  CHARACTER_IMAGES,
  CHARACTER_SEARCH,
  DECISIONS,
  DEPLOY_FLOW,
  GLOSSARY,
  GPU_FLOW,
  HARDWARE,
  LLM_FALLBACK,
  type Model,
  MODELS,
  PIPELINE,
  SERVICES,
  STACK,
  type Step,
  STATS,
  STORAGES,
  THRESHOLDS,
  type Tuning,
  TUNINGS,
  VRAM_BUNDLES,
  VRAM_RETRO,
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

const fmt = (n: number) => n.toLocaleString("ko-KR");

/**
 * 서비스 소개(포트폴리오) 페이지: 한눈에 보는 숫자, 실제 4컷, 전체 아키텍처(서비스·통신·데이터·인증·배포),
 * 설계 결정과 대안, 생성 흐름, 캐릭터 찾기, 하드웨어와 VRAM 배분(회고), AI 모델, 성능 개선과 문제 해결,
 * 기술 스택, 용어 풀이. 로그인 없이 볼 수 있다. 값은 lib/about.ts에 모아 둔다.
 */
export function AboutScreen() {
  return (
    <AppShell title="서비스 소개" back={HOME} width="wide">
      <div className="flex flex-col gap-16 pb-6 md:gap-24">
        <Intro />
        <Section
          id="examples"
          eyebrow="EXAMPLES"
          title="실제로 만들어진 4컷"
          description="사용자들이 녹음해서 만들고 전체 공개로 올린 최근 4컷이에요."
        >
          <AboutExamples />
        </Section>
        <Architecture />
        <Decisions />
        <Pipeline />
        <CharacterSearch />
        <HardwareSection />
        <Models />
        <Tunings />
        <StackSection />
        <Glossary />
        <Outro />
      </div>
    </AppShell>
  );
}

/** 아이콘을 담는 둥근 사각형. */
function IconTile({
  icon: Icon,
  tone = "light",
  className,
}: {
  icon: LucideIcon;
  tone?: "light" | "dark" | "accent";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        tone === "dark" && "bg-foreground text-background",
        tone === "light" && "bg-background text-accent",
        tone === "accent" && "bg-accent/10 text-accent-strong",
        className,
      )}
    >
      <Icon aria-hidden className="size-5" />
    </span>
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
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-accent-strong">{eyebrow}</p>
        <h2 id={id} className="text-2xl font-bold md:text-3xl">
          {title}
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold">{children}</h3>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span
            aria-hidden
            className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
          />
          {item}
        </li>
      ))}
    </ul>
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
          위에서 전체 과정을 관리하고, RTX 5060 Ti 16GB 한 장짜리 GPU PC가 음성
          인식과 그림을 맡아요. 어떤 구조로 만들었는지, 왜 그렇게 정했는지,
          성능을 어떻게 끌어올렸는지 정리했어요.
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
  icon: Icon,
  strong = false,
}: {
  title: string;
  detail: string;
  icon?: LucideIcon;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl px-4 py-3",
        strong ? "bg-foreground text-background" : "bg-background",
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          className={cn(
            "mt-0.5 size-4 shrink-0",
            strong ? "text-background" : "text-accent",
          )}
        />
      )}
      <div className="flex flex-col gap-0.5">
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

const [WEB, GATEWAY, AUTH, CONVERSATION, CONTENT, RUNTIME] = SERVICES;

function Diagram() {
  return (
    <figure
      aria-label="전체 아키텍처 그림"
      className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"
    >
      <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4 md:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Server aria-hidden className="size-4" />
          쿠버네티스 클러스터
        </p>
        <Box
          icon={Monitor}
          title="브라우저 (휴대폰 · PC)"
          detail="HTTPS, 암호화 쿠키 세션"
        />
        <Down label="Ingress (Nginx) · 외부 공개는 web 하나" />
        <Box strong icon={WEB.icon} title="web · Next.js" detail={WEB.role} />
        <Down label="로그인 토큰(JWT)을 붙여 호출" />
        <Box
          strong
          icon={GATEWAY.icon}
          title="api-gateway"
          detail={GATEWAY.role}
        />
        <Down label="REST + OpenAPI 계약" />
        <div className="grid gap-2 sm:grid-cols-3">
          {[AUTH, CONVERSATION, CONTENT].map((s) => (
            <Box key={s.name} icon={s.icon} title={s.name} detail={s.role} />
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {STORAGES.map((s) => (
            <Box
              key={s.name}
              icon={s.icon}
              title={s.name}
              detail={s.items[0]}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-foreground p-4 md:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Cpu aria-hidden className="size-4" />
            GPU PC
          </p>
          <Box
            strong
            icon={RUNTIME.icon}
            title="model-runtime (워커)"
            detail="일감을 가져가 → 30초마다 진행 상황을 알리고 → 결과를 올려요"
          />
          <Box
            icon={Gauge}
            title="Ollama (이 PC 안에서만)"
            detail="Qwen3 8B를 돌리는 로컬 LLM 실행기"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            GPU PC가 먼저 클러스터에 연결해 일을 가져가요. 그래서 GPU PC에는
            밖에서 들어오는 포트가 없어요.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4 md:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Cloud aria-hidden className="size-4" />
            외부 모델 API
          </p>
          <Box title="Claude API" detail="장면 고르기·콘티 1순위" />
          <Box title="Gemini API" detail="받아 적은 글 다듬기, 콘티 2순위" />
          <Box
            title="임베딩 서버"
            detail="BGE-M3로 외모 문장을 좌표로 바꿔요"
          />
        </div>
      </div>
    </figure>
  );
}

function StepGrid({ steps, cols }: { steps: Step[]; cols: string }) {
  return (
    <ol className={cn("grid gap-2", cols)}>
      {steps.map(({ icon, title, detail }, i) => (
        <li key={title} className="flex flex-col gap-2 rounded-xl bg-muted p-4">
          <div className="flex items-center gap-2">
            <IconTile icon={icon} className="size-8" />
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {i + 1}
            </span>
          </div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {detail}
          </p>
        </li>
      ))}
    </ol>
  );
}

function FlowRow({ label, steps }: { label: string; steps: Step[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5 md:p-6">
      <p className="text-base font-semibold">{label}</p>
      <StepGrid steps={steps} cols="sm:grid-cols-2 lg:grid-cols-4" />
    </div>
  );
}

function Architecture() {
  return (
    <Section
      id="architecture"
      eyebrow="ARCHITECTURE"
      title="전체 아키텍처"
      description="밖에서 보이는 것은 web 하나예요. 그 뒤에서 서비스 다섯 개가 역할을 나눠 맡고, GPU가 필요한 일은 GPU PC의 워커가 가져가 처리해요."
    >
      <Diagram />
      <div className="flex flex-col gap-4">
        <SubTitle>서비스마다 하는 일</SubTitle>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon, name, tech, role, details }) => (
            <li
              key={name}
              className="flex flex-col gap-3 rounded-2xl border border-border p-5"
            >
              <div className="flex items-center gap-3">
                <IconTile icon={icon} tone="dark" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">{tech}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-accent-strong">{role}</p>
              <Bullets items={details} />
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-4">
        <SubTitle>서비스끼리 주고받는 방식</SubTitle>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map(({ icon, title, detail }) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-2xl bg-muted p-5"
            >
              <div className="flex items-center gap-3">
                <IconTile icon={icon} />
                <p className="text-base font-semibold">{title}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-4">
        <SubTitle>데이터 저장소</SubTitle>
        <ul className="grid gap-3 md:grid-cols-2">
          {STORAGES.map(({ icon, name, items }) => (
            <li
              key={name}
              className="flex flex-col gap-3 rounded-2xl border border-border p-5"
            >
              <div className="flex items-center gap-3">
                <IconTile icon={icon} tone="accent" />
                <p className="text-base font-semibold">{name}</p>
              </div>
              <Bullets items={items} />
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-4">
        <SubTitle>세 가지 흐름</SubTitle>
        <FlowRow label="GPU 작업 한 건이 오가는 길" steps={GPU_FLOW} />
        <FlowRow label="로그인 정보가 오가는 길" steps={AUTH_FLOW} />
        <FlowRow label="코드가 운영에 반영되는 길" steps={DEPLOY_FLOW} />
      </div>
    </Section>
  );
}

function Decisions() {
  return (
    <Section
      id="decisions"
      eyebrow="DESIGN DECISIONS"
      title="설계 결정과 대안"
      description="갈림길마다 무엇을 고르고 무엇을 버렸는지, 그리고 그 이유예요."
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {DECISIONS.map(({ icon, title, choice, instead, why }) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5 md:p-6"
          >
            <div className="flex items-center gap-3">
              <IconTile icon={icon} tone="accent" />
              <p className="text-base font-semibold">{title}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="font-semibold text-success">선택</dt>
              <dd>{choice}</dd>
              <dt className="font-semibold text-muted-foreground">대안</dt>
              <dd className="text-muted-foreground">{instead}</dd>
            </dl>
            <p className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <Lightbulb
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-accent"
              />
              {why}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function WhereBadge({ where }: { where: Where }) {
  const Icon = WHERE_ICON[where];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
      description="사용자는 녹음만 해요. 나머지 단계는 conversation-service가 차례로 돌리고, 실패한 단계부터 자동으로 다시 시도해요."
    >
      <ol className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {PIPELINE.map(({ icon, title, description, models, where }, i) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <IconTile icon={icon} tone="accent" />
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="text-base font-semibold">{title}</p>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <WhereBadge where={where} />
              {models.map((m) => (
                <span
                  key={m}
                  className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-strong"
                >
                  {m}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function CharacterSearch() {
  return (
    <Section
      id="character-search"
      eyebrow="CHARACTER SEARCH"
      title="캐릭터 찾기"
      description={`대화 속 사람에게 어울리는 캐릭터를 ${fmt(CHARACTER_COUNT)}명 중에서 골라 네 컷 내내 같은 얼굴로 그려요. 이름이 같으면 바로 쓰고, 아니면 외모가 비슷한 캐릭터를 벡터 검색으로 찾아요.`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-2xl bg-accent/10 p-5 md:p-6">
          <p className="text-base font-semibold">왜 벡터 검색인가</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            이름이나 키워드가 정확히 같아야만 찾는 방식은, 같은 사람을 조금만
            다르게 묘사해도(예: 웨이브 머리 vs 곱슬머리, 후드티 vs 후드 점퍼)
            놓쳐요. 그래서 외모 문장을 뜻이 담긴 좌표(임베딩)로 바꾸고, 좌표끼리
            거리를 재서 뜻이 비슷한 캐릭터를 찾아요. 처음엔 Gemini 임베딩을
            썼지만 하루 요청 수 제한이 있어서, 제한이 없고 한국어·영어를 같은
            공간에 놓는 BGE-M3로 바꿨어요.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-muted p-5 md:p-6">
          <p className="text-base font-semibold">유사도와 거리</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            좌표는 원점에서 뻗은 화살표라고 생각하면 돼요. 코사인 유사도는 두
            화살표가 같은 방향을 가리키는 정도로, 같으면 1, 상관없으면 0에
            가까워요. 거리는 1에서 유사도를 뺀 값이라 0에 가까울수록 비슷해요.
            이 서비스는 거리 0.30 안쪽만 &ldquo;같은 인물&rdquo;로 봐요.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5 md:p-6">
        <p className="text-base font-semibold">찾는 순서</p>
        <StepGrid
          steps={CHARACTER_SEARCH}
          cols="sm:grid-cols-2 lg:grid-cols-4"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5 md:p-6">
          <p className="text-base font-semibold">거리 기준 0.30을 정한 방법</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            테마 7개, 콘티가 쓰는 여러 문장 형식, 일부만 쓴 외모, 한국어 문장,
            DB에 없는 존재(로봇, 용, 나무 등)까지 1,288개 문장을 만들어 거리를
            쟀어요. 그 결과 머리색·옷 색이 같다는 이유로 성별이나 나이가 다른
            캐릭터가 아주 가깝게(0.1 안쪽) 나오는 경우가 있어서, 성별·나이
            거르기를 함께 두기로 했어요.
          </p>
          <ul className="flex flex-col gap-2">
            {THRESHOLDS.map(({ label, result }) => (
              <li
                key={label}
                className={cn(
                  "flex flex-col gap-0.5 rounded-xl p-3 text-sm",
                  label.includes("채택")
                    ? "bg-foreground text-background"
                    : "bg-muted",
                )}
              >
                <span className="font-semibold">{label}</span>
                <span
                  className={
                    label.includes("채택")
                      ? "text-background/80"
                      : "text-muted-foreground"
                  }
                >
                  {result}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-muted p-5 md:p-6">
          <p className="text-base font-semibold">찾는 예</p>
          <ExampleMatch
            query="young woman, wavy black hair, teal hoodie"
            result="성별·나이가 맞는 가까운 캐릭터를 찾아 그 얼굴로 그리고, 대사 속 가명도 그 캐릭터 이름으로 바꿔요."
            ok
          />
          <ExampleMatch
            query="young man, short black hair … (가까운 후보가 young woman)"
            result="거리가 가까워도 첫 마디의 성별이 달라 후보에서 빠져요."
          />
          <ExampleMatch
            query="silver robot with blue eyes"
            result="DB에 로봇이 없어 거리가 0.30보다 멀어요. 캐릭터 없이 글 설명만으로 그려요."
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            캐릭터 DB는 {fmt(CHARACTER_COUNT)}명 × 테마 7개 × 표정 6개 ={" "}
            {fmt(CHARACTER_IMAGES)}장이에요. 지금은 만화 테마의 기본 표정을
            참조로 쓰고, 표정별 그림은 컷 감정에 맞춰 고르는 다음 단계용으로
            준비해 뒀어요.
          </p>
        </div>
      </div>
    </Section>
  );
}

function ExampleMatch({
  query,
  result,
  ok = false,
}: {
  query: string;
  result: string;
  ok?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-background p-3 text-sm">
      <code className="text-xs break-words text-foreground">{query}</code>
      <span className={ok ? "text-success" : "text-muted-foreground"}>
        {ok ? "✓ " : "✕ "}
        {result}
      </span>
    </div>
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
        {HARDWARE.map(({ icon, title, specs }) => (
          <div
            key={title}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5 md:p-6"
          >
            <div className="flex items-center gap-3">
              <IconTile icon={icon} tone="dark" />
              <p className="text-base font-semibold">{title}</p>
            </div>
            <Bullets items={specs} />
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
          설계 기준 배분이에요. 화면 출력 몫으로 약 2GB를 남기고 한 묶음이
          14GB를 넘지 않게 정했어요. 모델을 올리기 전에 남은 메모리를 확인하고,
          모자라면 작업을 대기열로 돌려보내요.
        </p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-foreground p-5 md:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold">
            회고: 16GB 한 장으로 끝까지 가기
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            세 모델 묶음을 모두 올리면 약 25GB가 필요하지만, 주어진 것은 16GB 한
            장이었어요. 더 큰 GPU를 바라기보다 &ldquo;무엇을 GPU에 꼭 두고,
            무엇을 밖으로 뺄지&rdquo;를 먼저 정했어요. 녹음과 그림은 밖으로
            보내지 않고 직접 처리하고, 글을 다루는 일은 클라우드에 맡기고, 전환
            비용은 PC 메모리로 숨겼어요. 그 결과 한 장으로도 받아 적기부터
            그림까지 전 과정이 돌아가요.
          </p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VRAM_RETRO.map(({ label, items }) => (
            <div
              key={label}
              className="flex flex-col gap-2 rounded-xl bg-muted p-4"
            >
              <dt className="text-sm font-semibold">{label}</dt>
              <dd>
                <Bullets items={items} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">
          다시 한다면 처음부터 &ldquo;모델 전환 비용&rdquo;을 먼저 재겠어요.
          그림 속도보다 모델을 내리고 다시 올리는 시간이 훨씬 컸고(86~194초), 이
          하나를 1초대로 줄인 것이 가장 큰 개선이었어요.
        </p>
      </div>
    </Section>
  );
}

function ModelCard({ model }: { model: Model }) {
  const { icon, name, what, role, size, where, io, why, settings } = model;
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-start gap-3">
        <IconTile icon={icon} tone="dark" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-semibold">{name}</p>
            <WhereBadge where={where} />
          </div>
          <p className="text-sm font-medium text-accent-strong">{role}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{what}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-xl bg-muted p-4 text-sm">
        <dt className="text-muted-foreground">크기</dt>
        <dd>{size}</dd>
        <dt className="text-muted-foreground">입력 → 출력</dt>
        <dd>{io}</dd>
      </dl>
      <div className="flex flex-col gap-1 text-sm leading-relaxed">
        <p className="font-semibold">왜 골랐나</p>
        <p className="text-muted-foreground">{why}</p>
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <p className="font-semibold">이렇게 설정했어요</p>
        <Bullets items={settings} />
      </div>
    </li>
  );
}

function Fallback() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted p-5 md:p-6">
      <p className="text-base font-semibold">콘티 LLM 대체 순서</p>
      <ol
        aria-label="LLM 대체 순서"
        className="flex flex-col gap-2 md:flex-row md:items-center"
      >
        {LLM_FALLBACK.map(({ name, detail }, i) => (
          <li key={name} className="flex items-center gap-2 md:flex-1">
            <div className="flex flex-1 flex-col rounded-xl bg-background px-4 py-3">
              <span className="text-sm font-semibold">{name}</span>
              <span className="text-xs text-muted-foreground">{detail}</span>
            </div>
            {i < LLM_FALLBACK.length - 1 && (
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 rotate-90 text-muted-foreground md:rotate-0"
              />
            )}
          </li>
        ))}
      </ol>
      <p className="text-sm leading-relaxed text-muted-foreground">
        세 모델 모두 같은 지시문과 같은 출력 형식(JSON 스키마)을 받아요. 앞
        순서가 실패하거나 한도에 걸리면 다음 순서가 이어받고, 막힌 곳은 10분
        동안 건너뛰어요. 그래서 외부 API가 모두 멈춰도 GPU PC에서 만화가 끝까지
        만들어져요.
      </p>
    </div>
  );
}

function Models() {
  return (
    <Section
      id="models"
      eyebrow="AI MODELS"
      title="사용한 AI 모델"
      description="모델 하나로 다 하지 않고, 단계마다 잘하는 모델을 골라 이어 붙였어요. 모델마다 무엇을 하는지, 왜 골랐는지, 어떻게 설정했는지 정리했어요. 낯선 용어는 맨 아래 용어 풀이를 보세요."
    >
      <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
        {MODELS.map((model) => (
          <ModelCard key={model.name} model={model} />
        ))}
      </ul>
      <Fallback />
      <div className="flex flex-col gap-2 rounded-2xl bg-accent/10 p-5 md:p-6">
        <p className="text-base font-semibold">
          캐릭터 DB {fmt(CHARACTER_IMAGES)}장
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          대화 속 사람을 대신할 캐릭터 {fmt(CHARACTER_COUNT)}명을 그림 테마
          7가지(일상, 동물, 수채화, 그림책, 신문 만화, 조선, 무협)와 표정
          6가지로 준비했어요. Claude와 함께 짠 SVG 그림 생성 코드로{" "}
          {fmt(CHARACTER_COUNT)} × 7 × 6 = {fmt(CHARACTER_IMAGES)}장을 그렸고,
          이 그림이 IP-Adapter에 넘기는 얼굴 참조가 돼요. 같은 캐릭터가
          일상에서는 의사 가운, 조선에서는 의녀 한복을 입어요.
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

const KIND_TONE: Record<Tuning["kind"], string> = {
  속도: "bg-accent/10 text-accent-strong",
  메모리: "bg-foreground text-background",
  품질: "bg-success/10 text-success",
  안정성: "bg-muted text-foreground",
};

function TuningCard({ tuning }: { tuning: Tuning }) {
  const { icon, kind, title, problem, cause, fix, before, after } = tuning;
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone="accent" />
        <div className="flex flex-col items-start gap-1">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-semibold",
              KIND_TONE[kind],
            )}
          >
            {kind}
          </span>
          <p className="text-base font-semibold">{title}</p>
        </div>
      </div>
      <dl className="flex flex-1 flex-col gap-2.5 text-sm leading-relaxed">
        <div>
          <dt className="font-semibold">문제</dt>
          <dd className="text-muted-foreground">{problem}</dd>
        </div>
        <div>
          <dt className="font-semibold">원인</dt>
          <dd className="text-muted-foreground">{cause}</dd>
        </div>
        <div>
          <dt className="font-semibold">해결</dt>
          <dd className="text-muted-foreground">{fix}</dd>
        </div>
      </dl>
      <div
        aria-label="전후 비교"
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-muted p-3 text-sm"
      >
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">전</span>
          <span className="font-medium text-muted-foreground">{before}</span>
        </div>
        <ArrowRight aria-hidden className="size-4 text-accent" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">후</span>
          <span className="font-semibold">{after}</span>
        </div>
      </div>
    </li>
  );
}

function Tunings() {
  return (
    <Section
      id="tuning"
      eyebrow="PERFORMANCE & FIXES"
      title="성능 개선과 문제 해결"
      description="GPU PC와 운영 환경에서 직접 재고 고친 것들이에요. 항목마다 문제, 원인, 해결, 전후 비교 순서로 정리했어요."
    >
      <ul className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {TUNINGS.map((tuning) => (
          <TuningCard key={tuning.title} tuning={tuning} />
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
        {STACK.map(({ icon, group, items }) => (
          <div
            key={group}
            className="flex flex-col gap-3 rounded-2xl border border-border p-5"
          >
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <IconTile icon={icon} tone="accent" className="size-8" />
              {group}
            </dt>
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

function Glossary() {
  return (
    <Section
      id="glossary"
      eyebrow="GLOSSARY"
      title="용어 풀이"
      description="이 페이지에 나오는 기술 용어를 짧게 풀었어요."
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GLOSSARY.map(({ term, meaning }) => (
          <div
            key={term}
            className="flex flex-col gap-1 rounded-2xl bg-muted p-5"
          >
            <dt className="text-base font-semibold">{term}</dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">
              {meaning}
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
        서비스 레포, 설계 문서, 스펙, 개선 기록을 커밋 단위로 볼 수 있어요.
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
