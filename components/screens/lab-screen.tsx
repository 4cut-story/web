"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { AppShell, HOME } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import {
  defaultShown,
  loadLab,
  loadRound,
  rawUrl,
  roundTitle,
  splitByReference,
  summarizeTiming,
  variantLabel,
  type Round,
  type Variant,
} from "@/lib/lab";
import { cn } from "@/lib/utils";

type Skeletons = Awaited<ReturnType<typeof loadLab>>;
type RoundRef = { id: string; info?: Round["info"] };

// 채점 파일은 그리지 못한 방식의 값을 null로 적는다. null도 빈 값으로 본다.
const sec = (n?: number | null) => (n == null ? "–" : `${n.toFixed(1)}초`);
const gib = (n?: number | null) => (n == null ? "–" : `${n.toFixed(1)}GiB`);
const score = (n?: number | null) => (n == null ? "–" : n.toFixed(1));

// 채택만 눈에 띄게 채운 초록으로, 나머지는 옅게 둔다.
const STATUS_STYLE: Record<string, string> = {
  채택: "bg-success font-semibold text-primary-foreground",
  "이전 채택": "border border-success text-success",
  기준: "border border-border text-foreground",
  비교: "bg-secondary text-secondary-foreground",
  탈락: "bg-muted text-muted-foreground line-through",
};

function Status({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs whitespace-nowrap",
        STATUS_STYLE[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

// 방식이 많으면 표가 길어지므로 처음에는 위에서부터 이만큼만 보인다.
const TABLE_LIMIT = 8;

/** 방식마다 순위·점수·속도·메모리·라이선스를 한 줄씩 보인다. 휴대폰에서는 표를 옆으로 밀어 보고, 방식 이름은 왼쪽에 붙어 있는다. */
function VariantTable({
  title,
  variants,
}: {
  title: string;
  variants: Variant[];
}) {
  const [all, setAll] = useState(false);
  if (variants.length === 0) return null;
  const rows = all ? variants : variants.slice(0, TABLE_LIMIT);
  const rest = variants.length - TABLE_LIMIT;
  const notes = variants.filter((v) => v.scores?.note || v.timing?.aborted);
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="overflow-x-auto">
        <table
          aria-label={title}
          className="w-full min-w-[52rem] text-left text-sm"
        >
          <caption className="px-4 py-3 text-left text-base font-semibold">
            {title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {variants.length}개
            </span>
          </caption>
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              {[
                "순위",
                "방식",
                "판단",
                "그림 점수",
                "심각 오류 편",
                "컷당 시간",
                "VRAM 최대",
                "모델 올리기",
                "라이선스",
              ].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    "px-3 py-2 font-medium whitespace-nowrap",
                    i === 1 && "sticky left-0 bg-muted",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => {
              const t = summarizeTiming(v.timing);
              const adopted = v.scores?.status === "채택";
              return (
                <tr
                  key={v.id}
                  className={cn(
                    "border-t border-border align-top",
                    adopted && "bg-success/5",
                  )}
                >
                  <td className="w-12 px-3 py-3 text-muted-foreground tabular-nums">
                    {v.scores?.average == null ? "–" : i + 1}
                  </td>
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 max-w-[16rem] min-w-[11rem] px-3 py-3 font-medium",
                      adopted
                        ? "bg-[color-mix(in_srgb,var(--success)_5%,var(--background))]"
                        : "bg-background",
                    )}
                  >
                    {variantLabel(v)}
                    {v.timing?.steps !== undefined && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {v.timing.steps} step · 그린 컷{" "}
                        {Object.values(v.comics).flat().length}
                        {t.failed > 0 && ` · 실패 ${t.failed}`}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-3">
                    <Status value={v.scores?.status} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    <strong>{score(v.scores?.average)}</strong>
                    {v.scores?.scores && (
                      <span className="block text-xs text-muted-foreground">
                        {v.scores.scores.map(score).join(" / ")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {v.scores?.criticalComics ?? "–"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    {sec(t.avg)}
                    {t.max !== undefined && (
                      <span className="block text-xs text-muted-foreground">
                        최대 {sec(t.max)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    {gib(v.timing?.peakVramGiB)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    {sec(v.timing?.loadSeconds)}
                  </td>
                  <td className="max-w-[14rem] min-w-[9rem] px-3 py-3 text-xs text-muted-foreground">
                    {v.scores?.license ?? "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="w-full border-t border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {all ? "접기" : `${rest}개 더 보기`}
        </button>
      )}
      {notes.length > 0 && (
        <details className="group border-t border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            방식별 메모 {notes.length}개
          </summary>
          <ul className="flex flex-col gap-2 px-4 pb-4 text-xs leading-relaxed text-muted-foreground">
            {notes.map((v) => (
              <li key={v.id}>
                <strong className="text-foreground">{variantLabel(v)}</strong>:{" "}
                {v.scores?.note ?? v.timing?.aborted}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "max-w-full shrink-0 rounded-[1.25rem] border px-3 py-1.5 text-left text-sm transition-colors",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  );
}

/** 섹션 머리: 작은 영문 머리말, 제목, 한 줄 설명. 서비스 소개(/about)와 같은 모양이다. */
function SectionHead({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-accent-strong">{eyebrow}</p>
        <h2 id={id} className="text-xl font-bold md:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** 회차 요약: 방식 수·편 수·컷 수와 지금 쓰는(채택) 방식. */
function Summary({ round }: { round: Round }) {
  const drawn = round.variants.filter((v) => Object.keys(v.comics).length > 0);
  const panels = drawn.reduce(
    (n, v) => n + Object.values(v.comics).flat().length,
    0,
  );
  const adopted = round.variants.find((v) => v.scores?.status === "채택");
  const t = summarizeTiming(adopted?.timing);
  const stats = [
    { label: "비교한 방식", value: `${round.variants.length}개` },
    { label: "콘티", value: `${round.comics.length}편` },
    { label: "그린 컷", value: `${panels.toLocaleString("ko-KR")}장` },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)] md:gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1 rounded-2xl bg-muted p-3 md:p-4"
        >
          <span className="text-xs text-muted-foreground">{s.label}</span>
          <span className="text-lg font-bold tabular-nums md:text-2xl">
            {s.value}
          </span>
        </div>
      ))}
      {adopted && (
        <div className="col-span-3 flex flex-col gap-1 rounded-2xl border border-success/40 bg-success/5 p-3 md:col-span-1 md:p-4">
          <span className="text-xs font-semibold text-success">
            지금 쓰는 방식
          </span>
          <span className="font-bold">{variantLabel(adopted)}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            평균 {score(adopted.scores?.average)}점 · 컷당 {sec(t.avg)} · VRAM{" "}
            {gib(adopted.timing?.peakVramGiB)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 고른 편을 방식마다 한 장씩 보인다. 컷은 방식끼리 같은 칸에 맞춰 놓여 위아래로 견줘 볼 수 있다.
 * 휴대폰은 2열(2×2), 넓은 화면은 한 줄에 모든 컷.
 */
function Compare({
  round,
  comic,
  shown,
}: {
  round: Round;
  comic: string;
  shown: Variant[];
}) {
  const cuts = Math.max(0, ...shown.map((v) => v.comics[comic]?.length ?? 0));
  // 컷이 적어도 한 칸이 화면을 다 차지하지 않게 최소 4칸으로 나눈다.
  const grid = { "--cuts": Math.max(cuts, 4) } as React.CSSProperties;
  const prompts = Array.from({ length: cuts }, (_, i) => ({
    no: i + 1,
    text: round.prompts[`${comic}-panel-${i + 1}`],
  })).filter((p) => p.text);
  return (
    <div className="flex flex-col gap-4">
      {shown.map((v) => (
        <article
          key={v.id}
          className="flex flex-col gap-3 rounded-2xl border border-border p-3 md:p-4"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold md:text-base">
              {variantLabel(v)}
            </h3>
            <p className="text-xs text-muted-foreground tabular-nums">
              이 편 {score(v.scores?.perComic?.[comic])}점 · 평균{" "}
              {score(v.scores?.average)}점
            </p>
          </header>
          <div
            className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(var(--cuts),minmax(0,1fr))] md:gap-3"
            style={grid}
          >
            {Array.from({ length: cuts }, (_, i) => {
              const path = v.comics[comic]?.[i];
              const took = v.timing?.panelSeconds?.[`${comic}-panel-${i + 1}`];
              return (
                <figure key={i} className="flex flex-col gap-1">
                  {path ? (
                    <a href={rawUrl(path)} target="_blank" rel="noreferrer">
                      {/* 원본 PNG는 한 장에 1MB쯤이라, 칸 크기에 맞춰 줄인 WebP로 받는다. 누르면 원본을 연다. */}
                      <Image
                        src={rawUrl(path)}
                        alt={`${variantLabel(v)} ${i + 1}컷`}
                        width={768}
                        height={768}
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="aspect-square w-full rounded-lg border border-border bg-muted object-cover transition-opacity hover:opacity-90"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                      그림 없음
                    </div>
                  )}
                  <figcaption className="text-xs text-muted-foreground tabular-nums">
                    {i + 1}컷{took !== undefined && ` · ${sec(took)}`}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </article>
      ))}
      {prompts.length > 0 && (
        <details className="rounded-2xl bg-muted p-4 text-sm">
          <summary className="cursor-pointer font-medium">
            컷 프롬프트 {prompts.length}개
          </summary>
          <ol className="mt-3 flex flex-col gap-2">
            {prompts.map((p) => (
              <li key={p.no} className="flex gap-3">
                <span className="w-8 shrink-0 font-medium tabular-nums">
                  {p.no}컷
                </span>
                <p className="text-muted-foreground">{p.text}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function RoundView({ round }: { round: Round }) {
  const drawn = round.variants.filter((v) => Object.keys(v.comics).length > 0);
  // 처음에는 채택한 방식만 고른다(모두 고르면 컷 그림을 수천 장 한꺼번에 받는다).
  const [picked, setPicked] = useState<Set<string>>(() => defaultShown(drawn));
  const [comic, setComic] = useState(
    () =>
      round.comics.find((c) =>
        drawn.some((v) => picked.has(v.id) && v.comics[c]),
      ) ?? round.comics[0],
  );
  const shown = drawn.filter((v) => picked.has(v.id) && v.comics[comic]);
  const { plain, reference } = splitByReference(round.variants);
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <section aria-labelledby="lab-scores" className="flex flex-col gap-5">
        <SectionHead
          id="lab-scores"
          eyebrow="SCORES"
          title="방식별 점수"
          description="그림 점수가 높은 순서예요. 표는 옆으로 밀어서 볼 수 있어요."
        />
        <VariantTable title="참조 없이 그림" variants={plain} />
        <VariantTable title="캐릭터 참조로 그림" variants={reference} />
      </section>

      <section aria-labelledby="lab-compare" className="flex flex-col gap-5">
        <SectionHead
          id="lab-compare"
          eyebrow="COMPARE"
          title="컷 나란히 보기"
          description="편과 방식을 고르면 같은 컷끼리 맞춰 보여요."
        />
        <div className="flex flex-col gap-5 rounded-2xl border border-border p-4 md:p-5">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">편 고르기</h3>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {round.comics.map((c) => (
                <Chip key={c} on={c === comic} onClick={() => setComic(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                비교할 방식
                <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                  {picked.size}/{drawn.length}
                </span>
              </h3>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setPicked(defaultShown(drawn))}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  채택만
                </button>
                <button
                  type="button"
                  onClick={() => setPicked(new Set(drawn.map((v) => v.id)))}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  모두 고르기
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              처음에는 채택한 방식(지금 쓰는 모델과 프롬프트)만 보여요. 눌러서
              비교할 방식을 더하세요.
            </p>
            <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto rounded-xl bg-muted/60 p-2">
              {drawn.map((v) => (
                <Chip
                  key={v.id}
                  on={picked.has(v.id)}
                  onClick={() => toggle(v.id)}
                >
                  {variantLabel(v)}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        {comic && shown.length > 0 ? (
          <Compare round={round} comic={comic} shown={shown} />
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            고른 편을 그린 방식이 없어요.
          </p>
        )}
      </section>
    </div>
  );
}

/**
 * 테스트 렌더 비교 화면: 같은 콘티를 여러 그림 모델로 그린 결과를 컷끼리 나란히 놓고 점수와 함께 본다.
 * 서버가 모아 둔 기록(rounds)을 받으면 그대로 그리고, 없으면 브라우저가 GitHub에서 직접 읽는다.
 * pending은 서버가 기록을 모으는 동안 보이는 불러오는 화면이다.
 */
export function LabScreen({
  rounds: given,
  pending = false,
}: {
  rounds?: Round[];
  pending?: boolean;
}) {
  const rounds = given?.length ? given : undefined;
  const [skeletons, setSkeletons] = useState<Skeletons>();
  const [roundId, setRoundId] = useState<string | undefined>(rounds?.[0]?.id);
  const [loaded, setLoaded] = useState<Round>();
  const [error, setError] = useState<string>();
  const direct = !rounds && !pending;
  const choices: RoundRef[] | undefined = rounds ?? skeletons;
  const round = rounds ? rounds.find((r) => r.id === roundId) : loaded;

  useEffect(() => {
    if (!direct) return;
    loadLab()
      .then((s) => {
        setSkeletons(s);
        setRoundId(s[0]?.id);
      })
      .catch(() =>
        setError("테스트 기록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."),
      );
  }, [direct]);

  useEffect(() => {
    const skeleton = skeletons?.find((s) => s.id === roundId);
    if (!skeleton) return;
    let live = true;
    loadRound(skeleton)
      .then((r) => live && setLoaded(r))
      .catch(() => live && setError("회차 기록을 불러오지 못했어요."));
    return () => {
      live = false;
    };
  }, [skeletons, roundId]);

  return (
    <AppShell title="그림 모델 비교" width="wide" back={HOME}>
      <div className="flex flex-col gap-10 pb-8 md:gap-14">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-accent-strong">LAB</p>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            같은 콘티를 여러 그림 모델과 설정으로 그려 본 테스트 기록이에요.
            공개 피드에는 올라가지 않아요. 새 방식이 채점되면 이 화면에 바로
            더해져요.
          </p>
          {choices && choices.length > 1 && (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {choices.map((s) => (
                <Chip
                  key={s.id}
                  on={s.id === roundId}
                  onClick={() => setRoundId(s.id)}
                >
                  {roundTitle(s)}
                </Chip>
              ))}
            </div>
          )}
        </div>
        {error && <ErrorText message={error} />}
        {!error && !round && (
          <div className="flex flex-col gap-3" aria-busy="true">
            <p className="text-sm text-muted-foreground">불러오는 중이에요…</p>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          </div>
        )}
        {round && round.id === roundId && (
          <>
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold md:text-3xl">
                {roundTitle(round)}
              </h2>
              {round.info.description && (
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {round.info.description}
                </p>
              )}
              <Summary round={round} />
            </div>
            <RoundView key={round.id} round={round} />
          </>
        )}
      </div>
    </AppShell>
  );
}
