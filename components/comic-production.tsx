import {
  drawDetails,
  duration,
  stepLabel,
  stepModels,
  summary,
} from "@/lib/production";
import type { Production } from "@/lib/types";

/**
 * 만화를 만든 과정: 전체 걸린 시간, 그림 모델, GPU와 단계별 모델·시간. 등장인물 소개 아래에 둔다. 제작 정보가 없는 예전
 * 만화나 모르는 형식이면 아무것도 그리지 않는다.
 */
export function ComicProduction({
  production,
}: {
  production?: Production | null;
}) {
  if (
    !production ||
    production.version !== 1 ||
    !Array.isArray(production.steps) ||
    production.steps.length === 0
  ) {
    return null;
  }
  const top = summary(production);
  return (
    <section aria-label="제작 정보" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">제작 정보</h2>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {top.total && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">전체</dt>
            <dd className="font-medium">{top.total}</dd>
          </div>
        )}
        {top.image && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">그림 모델</dt>
            <dd className="font-medium">{top.image}</dd>
          </div>
        )}
        {top.gpu && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">GPU</dt>
            <dd className="font-medium">{top.gpu}</dd>
          </div>
        )}
      </dl>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          단계별 모델과 시간
        </summary>
        <ol className="mt-2 flex flex-col gap-2">
          {production.steps.map((s) => {
            const models = stepModels(s);
            const details = s.step === "DRAW" ? drawDetails(s) : [];
            return (
              <li key={s.step} className="flex flex-col gap-0.5">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{stepLabel(s.step)}</span>
                  <span className="tabular-nums">{duration(s.ms)}</span>
                </div>
                {models.length > 0 && (
                  <span className="text-muted-foreground">
                    {models.join(", ")}
                  </span>
                )}
                {details.length > 0 && (
                  <span className="text-muted-foreground">
                    {details.join(" · ")}
                  </span>
                )}
                {s.attempts > 1 && (
                  <span className="text-muted-foreground">
                    {s.attempts}번째 시도에서 성공
                  </span>
                )}
              </li>
            );
          })}
          {production.preTranscribe && (
            <li className="flex justify-between gap-3 text-muted-foreground">
              <span>
                녹음 중 미리 받아쓰기 {production.preTranscribe.parts}번
              </span>
              <span className="tabular-nums">
                {duration(production.preTranscribe.runMs)}
              </span>
            </li>
          )}
        </ol>
      </details>
    </section>
  );
}
