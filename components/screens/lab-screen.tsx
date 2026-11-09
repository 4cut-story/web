"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import {
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

// 채점 파일은 그리지 못한 방식의 값을 null로 적는다. null도 빈 값으로 본다.
const sec = (n?: number | null) => (n == null ? "–" : `${n.toFixed(1)}초`);
const gib = (n?: number | null) => (n == null ? "–" : `${n.toFixed(1)}GiB`);
const score = (n?: number | null) => (n == null ? "–" : n.toFixed(1));

const STATUS_STYLE: Record<string, string> = {
  기준: "bg-primary text-primary-foreground",
  채택: "bg-success text-primary-foreground",
  탈락: "bg-muted text-muted-foreground",
};

function Status({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs whitespace-nowrap",
        STATUS_STYLE[value] ?? "bg-accent text-primary-foreground",
      )}
    >
      {value}
    </span>
  );
}

/** 방식마다 순위·점수·속도·메모리·라이선스를 한 줄씩 보인다. */
function VariantTable({
  title,
  variants,
}: {
  title: string;
  variants: Variant[];
}) {
  if (variants.length === 0) return null;
  const notes = variants.filter((v) => v.scores?.note || v.timing?.aborted);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <caption className="px-3 py-2 text-left text-sm font-semibold">
          {title}
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
            ].map((h) => (
              <th
                key={h}
                scope="col"
                className="px-3 py-2 font-medium whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => {
            const t = summarizeTiming(v.timing);
            return (
              <tr key={v.id} className="border-t border-border align-top">
                <td className="px-3 py-2 tabular-nums">
                  {v.scores?.average == null ? "–" : i + 1}
                </td>
                <th
                  scope="row"
                  className="px-3 py-2 font-medium whitespace-nowrap"
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
                <td className="px-3 py-2">
                  <Status value={v.scores?.status} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                  <strong>{score(v.scores?.average)}</strong>
                  {v.scores?.scores && (
                    <span className="block text-xs text-muted-foreground">
                      {v.scores.scores.map(score).join(" / ")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {v.scores?.criticalComics ?? "–"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                  {sec(t.avg)}
                  {t.max !== undefined && (
                    <span className="block text-xs text-muted-foreground">
                      최대 {sec(t.max)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {gib(v.timing?.peakVramGiB)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {sec(v.timing?.loadSeconds)}
                </td>
                <td className="px-3 py-2 text-xs">
                  {v.scores?.license ?? "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border p-3 text-xs text-muted-foreground">
          {notes.map((v) => (
            <li key={v.id}>
              <strong className="text-foreground">{variantLabel(v)}</strong>:{" "}
              {v.scores?.note ?? v.timing?.aborted}
            </li>
          ))}
        </ul>
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
        "rounded-full border px-3 py-1 text-sm",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border",
      )}
    >
      {children}
    </button>
  );
}

/** 고른 편을 방식마다 한 열씩, 같은 컷끼리 한 줄에 나란히 보인다. */
function Compare({
  round,
  comic,
  shown,
}: {
  round: Round;
  comic: string;
  shown: Variant[];
}) {
  const rows = Math.max(0, ...shown.map((v) => v.comics[comic]?.length ?? 0));
  const cols = {
    gridTemplateColumns: `repeat(${shown.length}, minmax(9rem, 1fr))`,
  };
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-fit gap-2" style={cols}>
        {shown.map((v) => (
          <div key={v.id} className="sticky top-0 text-sm">
            <p className="font-semibold">{variantLabel(v)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              이 편 {score(v.scores?.perComic?.[comic])}점 · 평균{" "}
              {score(v.scores?.average)}점
            </p>
          </div>
        ))}
        {Array.from({ length: rows }, (_, i) => {
          const name = `${comic}-panel-${i + 1}`;
          return [
            ...shown.map((v) => {
              const path = v.comics[comic]?.[i];
              const took = v.timing?.panelSeconds?.[name];
              return (
                <figure key={`${v.id}-${i}`} className="flex flex-col gap-1">
                  {path ? (
                    <a href={rawUrl(path)} target="_blank" rel="noreferrer">
                      {/* 원본 PNG를 GitHub에서 바로 받는다(next/image 최적화를 거치지 않는다). */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rawUrl(path)}
                        alt={`${variantLabel(v)} ${i + 1}컷`}
                        loading="lazy"
                        className="aspect-square w-full rounded-md border border-border bg-muted object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                      그림 없음
                    </div>
                  )}
                  <figcaption className="text-xs text-muted-foreground tabular-nums">
                    {i + 1}컷{took !== undefined && ` · ${sec(took)}`}
                  </figcaption>
                </figure>
              );
            }),
            round.prompts[name] ? (
              <details
                key={`p-${i}`}
                className="text-xs text-muted-foreground"
                style={{ gridColumn: "1 / -1" }}
              >
                <summary>{i + 1}컷 프롬프트</summary>
                <p className="mt-1">{round.prompts[name]}</p>
              </details>
            ) : null,
          ];
        })}
      </div>
    </div>
  );
}

function RoundView({ round }: { round: Round }) {
  const drawn = round.variants.filter((v) => Object.keys(v.comics).length > 0);
  const [comic, setComic] = useState(round.comics[0]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const shown = drawn.filter((v) => !hidden.has(v.id) && v.comics[comic]);
  const { plain, reference } = splitByReference(round.variants);
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <section className="flex flex-col gap-4">
      {round.info.description && (
        <p className="text-sm text-muted-foreground">
          {round.info.description}
        </p>
      )}
      <VariantTable title="참조 없이 그림" variants={plain} />
      <VariantTable title="캐릭터 참조로 그림" variants={reference} />
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">편 고르기</h2>
        <div className="flex flex-wrap gap-2">
          {round.comics.map((c) => (
            <Chip key={c} on={c === comic} onClick={() => setComic(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">비교할 방식</h2>
        <div className="flex flex-wrap gap-2">
          {drawn.map((v) => (
            <Chip
              key={v.id}
              on={!hidden.has(v.id)}
              onClick={() => toggle(v.id)}
            >
              {variantLabel(v)}
            </Chip>
          ))}
        </div>
      </div>
      {comic && shown.length > 0 ? (
        <Compare round={round} comic={comic} shown={shown} />
      ) : (
        <p className="text-sm text-muted-foreground">
          고른 편을 그린 방식이 없어요.
        </p>
      )}
    </section>
  );
}

/** 테스트 렌더 비교 화면: 같은 콘티를 여러 그림 모델로 그린 결과를 컷끼리 나란히 놓고 점수와 함께 본다. */
export function LabScreen() {
  const [skeletons, setSkeletons] = useState<Skeletons>();
  const [roundId, setRoundId] = useState<string>();
  const [round, setRound] = useState<Round>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadLab()
      .then((s) => {
        setSkeletons(s);
        setRoundId(s[0]?.id);
      })
      .catch(() =>
        setError("테스트 기록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."),
      );
  }, []);

  useEffect(() => {
    const skeleton = skeletons?.find((s) => s.id === roundId);
    if (!skeleton) return;
    let live = true;
    loadRound(skeleton)
      .then((r) => live && setRound(r))
      .catch(() => live && setError("회차 기록을 불러오지 못했어요."));
    return () => {
      live = false;
    };
  }, [skeletons, roundId]);

  return (
    <AppShell
      title="그림 모델 비교"
      width="wide"
      back={{ href: "/about", label: "서비스 소개로" }}
    >
      <div className="flex flex-col gap-6 pb-8">
        <p className="text-sm text-muted-foreground">
          같은 콘티를 여러 그림 모델과 설정으로 그려 본 테스트 기록이에요. 공개
          피드에는 올라가지 않아요. 새 방식이 채점되면 이 화면에 바로 더해져요.
        </p>
        {skeletons && skeletons.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {skeletons.map((s) => (
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
        {error && <ErrorText message={error} />}
        {!error && !round && (
          <p className="text-sm text-muted-foreground">불러오는 중이에요…</p>
        )}
        {round && round.id === roundId && (
          <>
            <h2 className="text-lg font-semibold">{roundTitle(round)}</h2>
            <RoundView key={round.id} round={round} />
          </>
        )}
      </div>
    </AppShell>
  );
}
