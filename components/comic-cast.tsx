import { CharacterImage } from "@/components/character-image";
import { CONCEPTS, DIALECTS } from "@/lib/recording";
import type { CastMember, Concept, Dialect } from "@/lib/types";

/** 그림체·사투리 표시 이름. 모르는 값(새 서버)은 그대로 보이지 않게 뺀다. */
function conceptLabel(concept: Concept | null | undefined) {
  return CONCEPTS.find((c) => c.value === concept && c.value !== "AUTO")?.label;
}

function dialectLabel(dialect: Dialect | null | undefined) {
  return DIALECTS.find((d) => d.value === dialect)?.label;
}

/**
 * 만화 아래 등장인물 소개와 만화를 만든 옵션. 만화 안에서는 호칭(할머니, 손녀…)으로 부르고, 여기서 캐릭터 그림과 이름을 함께
 * 보여 준다. 예전 만화처럼 소개도 옵션도 없으면 아무것도 그리지 않는다.
 */
export function ComicCast({
  cast,
  concept,
  dialect,
}: {
  cast?: CastMember[] | null;
  concept?: Concept | null;
  dialect?: Dialect | null;
}) {
  const people = cast ?? [];
  const style = conceptLabel(concept);
  const speech = dialectLabel(dialect);
  if (people.length === 0 && !style && !speech) {
    return null;
  }
  return (
    <section aria-label="등장인물" className="flex flex-col gap-3">
      {people.length > 0 && (
        <>
          <h2 className="text-base font-semibold">등장인물</h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {people.map((p) => (
              <li key={`${p.role}-${p.name}`} className="flex flex-col gap-1.5">
                <CharacterImage lookId={p.lookId} alt={`${p.role} ${p.name}`} />
                <span className="text-sm leading-tight font-semibold">
                  {p.role}
                </span>
                <span className="text-sm leading-tight text-muted-foreground">
                  {p.name}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {(style || speech) && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {style && (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">그림체</dt>
              <dd className="font-medium">{style}</dd>
            </div>
          )}
          {speech && (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">대사 사투리</dt>
              <dd className="font-medium">{speech}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
