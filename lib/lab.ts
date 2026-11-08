/**
 * 그림 모델 비교 기록(/lab). 테스트로 그린 컷 그림은 model-runtime 저장소의 평가 브랜치에 올라간다.
 * 브라우저가 그 브랜치 파일 목록과 파일을 GitHub에서 바로 읽으므로, 새 방식의 그림이 올라오면 배포 없이 화면에 나온다.
 *
 * 폴더 규칙: eval-out/<회차>/<방식>/<편>-panel-<n>.png, 같은 폴더의 timing.json(측정)과 scores.json(채점).
 * 회차 폴더의 round.json(제목·설명·기준 방식)과 panels.json(컷 프롬프트)은 있으면 쓴다.
 */
export const LAB_REPO = "4cut-story/model-runtime";
export const LAB_BRANCH = "eval/round29-outputs";
const ROOT = "eval-out/";

export const treeUrl = () =>
  `https://api.github.com/repos/${LAB_REPO}/git/trees/${LAB_BRANCH}?recursive=1`;
export const rawUrl = (path: string) =>
  `https://raw.githubusercontent.com/${LAB_REPO}/${LAB_BRANCH}/${path}`;

export type Timing = {
  model?: string;
  quant?: string;
  steps?: number;
  guidance?: number;
  loadSeconds?: number;
  panelSeconds?: Record<string, number>;
  failed?: Record<string, string>;
  peakVramGiB?: number;
  peakRamGiB?: number;
  aborted?: string;
  /** 캐릭터 참조 그림을 넣고 그렸는지. */
  reference?: boolean;
};

export type Scores = {
  label?: string;
  status?: string;
  license?: string;
  scores?: number[];
  average?: number;
  criticalComics?: number;
  perComic?: Record<string, number>;
  note?: string;
  /** 캐릭터 참조 그림을 넣고 그렸는지. */
  reference?: boolean;
};

export type RoundInfo = {
  title?: string;
  description?: string;
  baseline?: string;
};

export type Variant = {
  id: string;
  /** 편 → 컷 그림 경로(컷 순서대로). */
  comics: Record<string, string[]>;
  timing?: Timing;
  scores?: Scores;
};

export type Round = {
  id: string;
  info: RoundInfo;
  variants: Variant[];
  /** 그림이 하나라도 있는 편(panels.json 순서, 없으면 이름순). */
  comics: string[];
  /** 컷 이름(<편>-panel-<n>) → 프롬프트. */
  prompts: Record<string, string>;
};

type Skeleton = {
  id: string;
  files: Set<string>;
  variants: Map<
    string,
    { files: Set<string>; comics: Record<string, string[]> }
  >;
};

const PANEL = /^(.+)-panel-(\d+)\.(png|jpe?g|webp)$/i;
const panelNo = (path: string) =>
  Number(PANEL.exec(path.split("/").pop()!)?.[2]);

/** 브랜치 파일 목록에서 회차·방식·편 구조를 뽑는다. */
export function parseTree(paths: string[]): Skeleton[] {
  const rounds = new Map<string, Skeleton>();
  for (const path of paths) {
    if (!path.startsWith(ROOT)) continue;
    const parts = path.slice(ROOT.length).split("/");
    if (parts.length < 2) continue;
    const [roundId, second, third] = parts;
    const round =
      rounds.get(roundId) ??
      rounds
        .set(roundId, { id: roundId, files: new Set(), variants: new Map() })
        .get(roundId)!;
    if (parts.length === 2) {
      round.files.add(second);
      continue;
    }
    if (parts.length !== 3) continue;
    const variant =
      round.variants.get(second) ??
      round.variants.set(second, { files: new Set(), comics: {} }).get(second)!;
    const panel = PANEL.exec(third);
    if (panel) {
      (variant.comics[panel[1]] ??= []).push(path);
    } else {
      variant.files.add(third);
    }
  }
  for (const round of rounds.values()) {
    for (const variant of round.variants.values()) {
      for (const list of Object.values(variant.comics)) {
        list.sort((a, b) => panelNo(a) - panelNo(b));
      }
    }
  }
  return [...rounds.values()].sort((a, b) =>
    b.id.localeCompare(a.id, "en", { numeric: true }),
  );
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

const optional = <T>(has: boolean, path: string) =>
  has
    ? getJson<T>(rawUrl(path)).catch(() => undefined)
    : Promise.resolve(undefined);

/** 기준 방식을 맨 앞에, 그다음 점수 높은 순, 점수 없는 방식은 이름순으로 뒤에 둔다. */
export function orderVariants(
  variants: Variant[],
  baseline?: string,
): Variant[] {
  const rank = (v: Variant) =>
    v.id === baseline ? Infinity : (v.scores?.average ?? -1);
  return [...variants].sort(
    (a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id),
  );
}

/** 캐릭터 참조 그림을 넣고 그린 방식인지: scores.json·timing.json의 reference, 없으면 폴더 이름의 "-ref". */
export const isReference = (v: Variant) =>
  v.scores?.reference ?? v.timing?.reference ?? /(^|-)ref(-|$)/.test(v.id);

/** 참조 없이 그린 방식과 참조로 그린 방식을 나눠 각각 점수 높은 순(점수 없으면 이름순 뒤)으로 둔다. */
export function splitByReference(variants: Variant[]): {
  plain: Variant[];
  reference: Variant[];
} {
  return {
    plain: orderVariants(variants.filter((v) => !isReference(v))),
    reference: orderVariants(variants.filter(isReference)),
  };
}

export async function loadRound(skeleton: Skeleton): Promise<Round> {
  const base = `${ROOT}${skeleton.id}/`;
  const [info, panels, variants] = await Promise.all([
    optional<RoundInfo>(skeleton.files.has("round.json"), `${base}round.json`),
    optional<{ name: string; comic: string; prompt: string }[]>(
      skeleton.files.has("panels.json"),
      `${base}panels.json`,
    ),
    Promise.all(
      [...skeleton.variants].map(async ([id, v]): Promise<Variant> => {
        const [timing, scores] = await Promise.all([
          optional<Timing>(
            v.files.has("timing.json"),
            `${base}${id}/timing.json`,
          ),
          optional<Scores>(
            v.files.has("scores.json"),
            `${base}${id}/scores.json`,
          ),
        ]);
        return { id, comics: v.comics, timing, scores };
      }),
    ),
  ]);
  const drawn = new Set(variants.flatMap((v) => Object.keys(v.comics)));
  const order = [...new Set((panels ?? []).map((p) => p.comic))];
  const comics = [
    ...order.filter((c) => drawn.has(c)),
    ...[...drawn].filter((c) => !order.includes(c)).sort(),
  ];
  return {
    id: skeleton.id,
    info: info ?? {},
    variants: orderVariants(variants, info?.baseline),
    comics,
    prompts: Object.fromEntries((panels ?? []).map((p) => [p.name, p.prompt])),
  };
}

export async function loadLab(): Promise<Skeleton[]> {
  const tree = await getJson<{ tree: { path: string; type: string }[] }>(
    treeUrl(),
  );
  return parseTree(
    tree.tree.filter((t) => t.type === "blob").map((t) => t.path),
  );
}

export type TimingSummary = {
  /** timing.json에 시간이 남은 컷 수. */
  drawn: number;
  failed: number;
  avg?: number;
  max?: number;
};

export function summarizeTiming(timing?: Timing): TimingSummary {
  const values = Object.values(timing?.panelSeconds ?? {});
  return {
    drawn: values.length,
    failed: Object.keys(timing?.failed ?? {}).length,
    avg: values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : undefined,
    max: values.length ? Math.max(...values) : undefined,
  };
}

/** 방식 이름: scores.json label → 모델·양자화 → 폴더 이름. */
export function variantLabel(v: Variant): string {
  if (v.scores?.label) return v.scores.label;
  const model = v.timing?.model
    ?.split("/")
    .pop()
    ?.replace(/^FLUX\.1-/, "");
  return model && v.timing?.quant
    ? `${model} ${v.timing.quant.toUpperCase()}`
    : v.id;
}

export const roundTitle = (r: { id: string; info?: RoundInfo }) =>
  r.info?.title ?? r.id.replace(/^round(\d+)$/, "회차 $1");
