import { describe, expect, it } from "vitest";

import {
  drawDetails,
  duration,
  jobModel,
  stepLabel,
  stepModels,
  summary,
} from "./production";
import type { Production } from "./types";

const PRODUCTION: Production = {
  version: 1,
  totalMs: 95_000,
  steps: [
    {
      step: "TRANSCRIBE",
      ms: 30_000,
      attempts: 1,
      jobs: [
        {
          type: "TRANSCRIBE",
          runMs: 21_000,
          info: { whisper: "large-v3", diarization: true },
        },
      ],
    },
    {
      step: "SCRIPT",
      ms: 12_000,
      attempts: 2,
      request: { model: "qwen3:8b" },
      jobs: [
        {
          type: "LLM",
          worker: "cloud-llm",
          runMs: 9000,
          info: { model: "claude-opus-5-5" },
        },
        {
          type: "LLM",
          worker: "cloud-llm",
          runMs: 8000,
          info: { model: "claude-opus-5-5" },
        },
      ],
    },
    {
      step: "REVIEW",
      ms: 500,
      attempts: 1,
      request: { model: "qwen3:8b" },
      jobs: [],
    },
    {
      step: "DRAW",
      ms: 41_000,
      attempts: 1,
      request: { seed: 11, size: 768 },
      jobs: [
        {
          type: "IMAGE",
          runMs: 40_000,
          info: {
            flux: "black-forest-labs/FLUX.1-schnell",
            quantization: "nf4",
            steps: 4,
            guidance: 0,
            gpu: "NVIDIA GeForce RTX 5060 Ti",
            loadMs: 12_000,
            panels: [
              { name: "p1", ms: 8000, seed: 11, width: 768, height: 768 },
              { name: "p2", ms: 9200, seed: 11, width: 768, height: 768 },
            ],
          },
        },
      ],
    },
  ],
};

describe("제작 정보 (FR-006)", () => {
  it("걸린 시간을 쉬운 말로 쓴다", () => {
    expect(duration(800)).toBe("0.8초");
    expect(duration(12_400)).toBe("12초");
    expect(duration(95_000)).toBe("1분 35초");
    expect(duration(120_000)).toBe("2분");
    expect(duration(3_720_000)).toBe("1시간 2분");
    expect(duration(3_600_000)).toBe("1시간");
  });

  it("단계 이름과 모델을 보여 주고, 모르는 단계는 그대로 둔다", () => {
    expect(stepLabel("DRAW")).toBe("컷 그리기");
    expect(stepLabel("NEW_STEP")).toBe("NEW_STEP");
    expect(stepModels(PRODUCTION.steps[0])).toEqual([
      "WhisperX large-v3 · 화자 분리",
    ]);
    expect(stepModels(PRODUCTION.steps[1])).toEqual(["claude-opus-5-5"]);
    expect(stepModels(PRODUCTION.steps[2])).toEqual(["qwen3:8b (로컬)"]);
    expect(jobModel({ type: "LLM", runMs: 1, info: { model: "manual" } })).toBe(
      "수동 입력(시험용)",
    );
    expect(
      jobModel({ type: "LLM", runMs: 1, info: { ollama: "qwen3:8b" } }),
    ).toBe("qwen3:8b (로컬)");
    expect(jobModel({ type: "LLM", runMs: 1 })).toBeNull();
  });

  it("그림 단계는 컷 수, 컷당 시간, 크기, step, 시드, 모델 올린 시간을 보여 준다", () => {
    expect(drawDetails(PRODUCTION.steps[3])).toEqual([
      "컷 2장, 컷당 평균 8.6초",
      "768×768",
      "4 step",
      "guidance 0",
      "시드 11",
      "모델 올리기 12초",
    ]);
    expect(
      drawDetails({
        step: "DRAW",
        ms: 1,
        attempts: 1,
        request: { seed: 3, size: 512 },
        jobs: [
          {
            type: "IMAGE",
            runMs: 1,
            info: { sdxl: "x/sdxl", lora: "y/lightning", fellBackToSdxl: true },
          },
        ],
      }),
    ).toEqual([
      "512×512",
      "LoRA lightning",
      "시드 3",
      "FLUX 실패로 SDXL로 그림",
    ]);
  });

  it("요약에 전체 시간, 그림 모델, GPU를 넣는다", () => {
    expect(summary(PRODUCTION)).toEqual({
      total: "1분 35초",
      image: "FLUX.1-schnell NF4 4bit",
      gpu: "NVIDIA GeForce RTX 5060 Ti",
    });
    expect(summary({ version: 1, steps: [] })).toEqual({
      total: null,
      image: null,
      gpu: null,
    });
  });
});
