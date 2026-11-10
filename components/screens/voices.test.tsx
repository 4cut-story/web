import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VoicesScreen } from "./voices-screen";
import VoicesPage, { metadata } from "@/app/voices/page";
import { type Voice, groupVoices, voiceAudioUrl } from "@/lib/voices";
import { mockFetch } from "@/test/fetch-mock";

const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();
const sources: string[] = [];

beforeEach(() => {
  mockFetch({});
  vi.stubGlobal(
    "Audio",
    vi.fn(function (this: Record<string, unknown>, src: string) {
      sources.push(src);
      this.src = src;
      this.play = play;
      this.pause = pause;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  play.mockClear();
  pause.mockClear();
  sources.length = 0;
});

function voice(over: Partial<Voice>): Voice {
  return {
    id: "f-young-bright",
    name: "하늘",
    gender: "female",
    ageGroup: "YOUNG",
    dialect: null,
    tone: "밝음",
    description: "밝고 또렷한 20대 여성 목소리",
    samples: {
      neutral: { text: "안녕, 오늘 날씨 좋다.", durationMs: 2000 },
      happy: { text: "와, 진짜? 합격했어!", durationMs: 2100 },
    },
    ...over,
  };
}

const VOICES: Voice[] = [
  voice({}),
  voice({
    id: "m-old-warm",
    name: "봉수",
    gender: "male",
    ageGroup: "OLD",
    tone: "다정함",
  }),
  voice({
    id: "m-middle-gyeongsang",
    name: "덕배",
    gender: "male",
    ageGroup: "MIDDLE",
    dialect: "GYEONGSANG",
    tone: "무뚝뚝함",
    traits: ["낮음", "억셈"],
  }),
];

describe("목소리 페이지", () => {
  it("표준어 인물은 연령대별로, 사투리 인물은 따로 묶는다", () => {
    expect(groupVoices(VOICES, "").map((g) => g.title)).toEqual([
      "청년",
      "노년",
      "사투리",
    ]);
    expect(groupVoices(VOICES, "female").map((g) => g.title)).toEqual(["청년"]);
    expect(voiceAudioUrl("m-old-warm", "sad")).toBe(
      "/voices/m-old-warm/sad.mp3",
    );
  });

  it("성별로 거르고, 감정 버튼을 누르면 그 대사를 들려준다", async () => {
    const user = userEvent.setup();
    render(<VoicesScreen voices={VOICES} />);
    expect(screen.getByRole("region", { name: "사투리" })).toHaveTextContent(
      "남성 · 중년 · 경상도 · 무뚝뚝함",
    );

    await user.click(screen.getByRole("radio", { name: "여성" }));
    expect(screen.queryByText("봉수")).not.toBeInTheDocument();

    const card = screen.getByRole("group", { name: "하늘 감정별 듣기" });
    expect(within(card).getAllByRole("button")).toHaveLength(2);
    await user.click(
      within(card).getByRole("button", { name: "하늘 기쁨 듣기" }),
    );
    expect(sources).toEqual(["/voices/f-young-bright/happy.mp3"]);
    expect(play).toHaveBeenCalled();
    expect(screen.getByText(/와, 진짜\? 합격했어!/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "하늘 기쁨 멈추기" }));
    expect(pause).toHaveBeenCalled();
    expect(screen.queryByText(/합격했어/)).not.toBeInTheDocument();
  });

  it("목소리가 아직 없으면 준비 중이라고 알린다", () => {
    render(<VoicesScreen voices={[]} />);
    expect(screen.getByText("목소리를 준비하고 있어요")).toBeInTheDocument();
  });

  it("페이지 제목과 설명을 단다", () => {
    render(<VoicesPage />);
    expect(metadata.title).toBeDefined();
    expect(String(metadata.description)).toContain("가상 인물 목소리");
  });
});
