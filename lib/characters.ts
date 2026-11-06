import { CONCEPTS } from "./recording";
import type { AgeGroup, CharacterLook, Expression, Gender } from "./types";

/** 캐릭터 갤러리 표시 이름과 순서. 순서는 conversation-service와 같다. */
export type Theme = CharacterLook["concept"];

export const THEMES = CONCEPTS.filter(
  (c): c is { value: Theme; label: string } => c.value !== "AUTO",
);

export const EXPRESSIONS: { value: Expression; label: string }[] = [
  { value: "NEUTRAL", label: "기본" },
  { value: "HAPPY", label: "기쁨" },
  { value: "SAD", label: "슬픔" },
  { value: "ANGRY", label: "화남" },
  { value: "SURPRISED", label: "놀람" },
  { value: "EMBARRASSED", label: "당황" },
];

export const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "CHILD", label: "어린이" },
  { value: "YOUNG", label: "청년" },
  { value: "MIDDLE", label: "중년" },
  { value: "OLD", label: "노년" },
];

export const GENDERS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "여성" },
  { value: "MALE", label: "남성" },
];

function labelOf<T extends string>(
  list: { value: T; label: string }[],
  value: T | null | undefined,
): string | undefined {
  return list.find((x) => x.value === value)?.label;
}

/** "청년 · 여성 · 의사"처럼 아는 것만 잇는다. */
export function profileLine(c: {
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  job: string | null;
}): string {
  return [labelOf(AGE_GROUPS, c.ageGroup), labelOf(GENDERS, c.gender), c.job]
    .filter(Boolean)
    .join(" · ");
}

export function themeLabel(theme: Theme): string {
  return labelOf(THEMES, theme) ?? theme;
}

export function expressionLabel(e: Expression): string {
  return labelOf(EXPRESSIONS, e) ?? e;
}

/** 갤러리 거르기 조건. 빈 값은 거르지 않는다. */
export type CharacterFilter = {
  theme: Theme;
  job: string;
  ageGroup: AgeGroup | "";
  gender: Gender | "";
  q: string;
};

export const DEFAULT_FILTER: CharacterFilter = {
  theme: "DAILY",
  job: "",
  ageGroup: "",
  gender: "",
  q: "",
};

function pick<T extends string>(
  list: { value: T }[],
  value: string | undefined,
): T | undefined {
  return list.find((x) => x.value === value)?.value;
}

/** 주소 쿼리 → 조건. 모르는 값은 기본값으로 둔다. */
export function parseFilter(
  query: Record<string, string | string[] | undefined>,
): CharacterFilter {
  const one = (k: string) => {
    const v = query[k];
    return (Array.isArray(v) ? v[0] : v)?.slice(0, 50);
  };
  return {
    theme: pick(THEMES, one("theme")) ?? DEFAULT_FILTER.theme,
    job: one("job") ?? "",
    ageGroup: pick(AGE_GROUPS, one("age")) ?? "",
    gender: pick(GENDERS, one("gender")) ?? "",
    q: one("q")?.slice(0, 30) ?? "",
  };
}

/** 조건 → 화면 주소 쿼리 (기본값은 뺀다). */
export function filterQuery(f: CharacterFilter): string {
  const p = new URLSearchParams();
  if (f.theme !== DEFAULT_FILTER.theme) p.set("theme", f.theme);
  if (f.job) p.set("job", f.job);
  if (f.ageGroup) p.set("age", f.ageGroup);
  if (f.gender) p.set("gender", f.gender);
  if (f.q.trim()) p.set("q", f.q.trim());
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** 조건 → API 경로. */
export function filterApiPath(f: CharacterFilter, size = 48): string {
  const p = new URLSearchParams({ concept: f.theme, size: String(size) });
  if (f.job) p.set("job", f.job);
  if (f.ageGroup) p.set("ageGroup", f.ageGroup);
  if (f.gender) p.set("gender", f.gender);
  if (f.q.trim()) p.set("q", f.q.trim());
  return `/characters?${p.toString()}`;
}
