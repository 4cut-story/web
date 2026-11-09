import { ambientParticles } from "@/lib/live";
import type { Ambient } from "@/lib/types";

/**
 * 라이브 모드 화면 효과 층 (docs specs/003-live-mode FR-040~043). 그림 위에 별빛·비·눈 같은 작은 움직임을 CSS로 그린다.
 * GPU 그림이 들지 않는다. 멈춰 있으면 움직임도 멈춘다.
 */
export function AmbientLayer({
  types,
  playing,
}: {
  types: Ambient[];
  playing: boolean;
}) {
  if (types.length === 0) {
    return null;
  }
  return (
    <div
      aria-hidden
      data-testid="ambient"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {types.map((type) =>
        ambientParticles(type).map((p, k) => (
          <span
            key={`${type}-${k}`}
            data-ambient={type}
            className={`ambient ambient-${type}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.width}px`,
              height: `${p.height}px`,
              animationDuration: `${p.durationMs}ms`,
              animationDelay: `${p.delayMs}ms`,
              animationPlayState: playing ? "running" : "paused",
            }}
          />
        )),
      )}
    </div>
  );
}
