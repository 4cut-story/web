import type {
  Production,
  ProductionJob,
  ProductionJobInfo,
  ProductionStep,
} from "@/lib/types";

/** 단계 표시 이름. 모르는 단계(새 서버)는 그대로 둔다. */
const STEP_LABELS: Record<string, string> = {
  TRANSCRIBE: "말 받아쓰기",
  EXTRACT: "이야기 거리 찾기",
  SELECT: "장면 고르기",
  SCRIPT: "콘티·대사 쓰기",
  REVIEW: "콘티 검토",
  DRAW: "컷 그리기",
  COMPOSE: "말풍선·합성",
};

const IMAGE_KEYS = ["flux", "sdxl", "sd35", "qwen"] as const;

/** "0.8초", "12초", "1분 35초", "1시간 2분". */
export function duration(ms: number): string {
  const sec = Math.max(0, ms) / 1000;
  if (sec < 10) {
    return `${Math.round(sec * 10) / 10}초`;
  }
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  if (m > 0) {
    return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  }
  return `${s}초`;
}

export function stepLabel(step: string): string {
  return STEP_LABELS[step] ?? step;
}

/** 저장소 이름 앞의 조직을 뗀다: "black-forest-labs/FLUX.1-schnell" → "FLUX.1-schnell". */
function shortName(name: string): string {
  return name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
}

/** 양자화 표시: nf4 → "NF4 4bit", gguf-q8_0 → "GGUF-Q8_0", 없으면 null. */
function quantLabel(quant: string | null | undefined): string | null {
  if (!quant || quant === "none" || quant === "auto") {
    return null;
  }
  const upper = quant.toUpperCase();
  return upper === "NF4" ? "NF4 4bit" : upper;
}

/** 그림 작업이면 그림 모델 정보. */
export function imageModel(info: ProductionJobInfo | undefined) {
  if (!info) {
    return null;
  }
  const key = IMAGE_KEYS.find((k) => typeof info[k] === "string");
  if (!key) {
    return null;
  }
  return {
    name: shortName(info[key] as string),
    quant: quantLabel(info.quantization),
    steps: typeof info.steps === "number" ? info.steps : null,
    guidance: typeof info.guidance === "number" ? info.guidance : null,
    lora: info.lora ? shortName(info.lora) : null,
    fellBack: info.fellBackToSdxl === true,
  };
}

/** 작업을 처리한 모델 한 줄. 모르면 null. */
export function jobModel(job: ProductionJob): string | null {
  const info = job.info;
  const image = imageModel(info);
  if (image) {
    return [image.name, image.quant].filter(Boolean).join(" ");
  }
  if (info?.whisper) {
    return `WhisperX ${info.whisper}${info.diarization ? " · 화자 분리" : ""}`;
  }
  if (typeof info?.model === "string") {
    return info.model === "manual" ? "수동 입력(시험용)" : info.model;
  }
  if (typeof info?.ollama === "string" && info.ollama) {
    return `${info.ollama} (로컬)`;
  }
  return null;
}

/** 단계에서 쓴 모델들 (같은 모델은 한 번만). 작업 정보가 없으면 단계 요청의 모델. */
export function stepModels(step: ProductionStep): string[] {
  const names = step.jobs.map(jobModel).filter((n): n is string => !!n);
  if (names.length === 0 && typeof step.request?.model === "string") {
    if (step.jobs.every((j) => j.worker !== "cloud-llm")) {
      return [`${step.request.model} (로컬)`];
    }
  }
  return [...new Set(names)];
}

/** 컷 그리기 단계의 조건: 컷 수, 컷당 평균 시간, 크기, step, 시드, 모델 올린 시간. */
export function drawDetails(step: ProductionStep): string[] {
  const job = step.jobs.find((j) => j.type === "IMAGE");
  const info = job?.info;
  const image = imageModel(info);
  const panels = info?.panels ?? [];
  const out: string[] = [];
  if (panels.length > 0) {
    const avg = panels.reduce((sum, p) => sum + p.ms, 0) / panels.length;
    out.push(`컷 ${panels.length}장, 컷당 평균 ${duration(avg)}`);
  }
  const width = panels[0]?.width ?? step.request?.size;
  const height = panels[0]?.height ?? step.request?.size;
  if (typeof width === "number" && typeof height === "number") {
    out.push(`${width}×${height}`);
  }
  if (image?.steps) {
    out.push(`${image.steps} step`);
  }
  if (image?.guidance !== null && image?.guidance !== undefined) {
    out.push(`guidance ${image.guidance}`);
  }
  if (image?.lora) {
    out.push(`LoRA ${image.lora}`);
  }
  const seed = panels[0]?.seed ?? step.request?.seed;
  if (typeof seed === "number") {
    out.push(`시드 ${seed}`);
  }
  if (typeof info?.loadMs === "number" && info.loadMs >= 1000) {
    out.push(`모델 올리기 ${duration(info.loadMs)}`);
  }
  if (image?.fellBack) {
    out.push("FLUX 실패로 SDXL로 그림");
  }
  return out;
}

/** 요약: 전체 시간, 그림 모델, GPU. */
export function summary(production: Production) {
  const draw = production.steps.find((s) => s.step === "DRAW");
  const imageJob = draw?.jobs.find((j) => j.type === "IMAGE");
  const gpu = production.steps
    .flatMap((s) => s.jobs)
    .map((j) => j.info?.gpu)
    .find((g): g is string => typeof g === "string" && g.length > 0);
  return {
    total:
      typeof production.totalMs === "number"
        ? duration(production.totalMs)
        : null,
    image: imageJob ? jobModel(imageJob) : null,
    gpu: gpu ?? null,
  };
}
