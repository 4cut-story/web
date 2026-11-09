import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SoundScreen } from "./sound-screen";
import { SoundsScreen } from "./sounds-screen";
import {
  DEFAULT_SOUND_FILTER,
  durationLabel,
  parseSoundFilter,
  soundApiPath,
  soundFilterQuery,
} from "@/lib/sounds";
import { json, mockFetch } from "@/test/fetch-mock";
import { router } from "@/test/screen";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    "Audio",
    vi.fn(function (this: Record<string, unknown>, src: string) {
      this.src = src;
      this.play = play;
      this.pause = pause;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  router.replace.mockReset();
  play.mockClear();
  pause.mockClear();
});

const ID = "V1StGXR8_Z5jdHi6B-myT";

function sound(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `s${n}`,
    kind: "AMBIENCE",
    category: "OCEAN_WAVES",
    title: `파도${n}`,
    description: "밤바다에 잔잔한 파도가 밀려와요.",
    moods: ["PEACEFUL", "LONELY"],
    places: ["바닷가"],
    durationMs: 12000,
    credit: {
      source: "FSD50K",
      sourceUrl: "https://freesound.org/s/1/",
      originalTitle: "waves.wav",
      author: "someone",
      license: "CC-BY-3.0",
      licenseUrl: "http://creativecommons.org/licenses/by/3.0/",
    },
    ...overrides,
  };
}

const FACETS = {
  categories: [
    { kind: "AMBIENCE", category: "OCEAN_WAVES", count: 21 },
    { kind: "MUSIC", category: "MUSIC_JAZZ", count: 8 },
  ],
  moods: [{ mood: "PARTY", count: 30 }],
};

describe("배경음 라이브러리", () => {
  it("배경음을 카드로 보여 주고, 듣기 버튼으로 한 번에 하나만 재생하고, 저작자를 표시한다", async () => {
    const calls = mockFetch({
      "GET /api/v1/sounds/facets": json(FACETS),
      "GET /api/v1/sounds?size=30&cursor=n1": json({
        items: [sound(2)],
        nextCursor: null,
      }),
      "GET /api/v1/sounds?size=30": json({
        items: [sound(1)],
        nextCursor: "n1",
      }),
    });
    render(<SoundsScreen initial={DEFAULT_SOUND_FILTER} />);
    const link = await screen.findByRole("link", { name: "파도1" });
    expect(link).toHaveAttribute("href", "/sounds/s1");
    const card = link.closest("article") as HTMLElement;
    expect(card).toHaveTextContent("바닷가 파도 · 0:12");
    expect(within(card).getByText("평화로운")).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "waves.wav · someone" }),
    ).toHaveAttribute("href", "https://freesound.org/s/1/");
    expect(within(card).getByRole("link", { name: "CC BY 3.0" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "파도1 듣기" }));
    expect(Audio).toHaveBeenCalledWith("/api/images/sounds/s1");
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "파도1 멈추기" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "파도1 멈추기" }));
    expect(pause).toHaveBeenCalled();

    expect(
      await screen.findByRole("option", { name: "바닷가 파도 (21)" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(await screen.findByRole("link", { name: "파도2" })).toBeVisible();
    expect(calls.some((c) => c.url.includes("cursor=n1"))).toBe(true);
  });

  it("종류·카테고리·분위기·검색어를 주소에 남기고 다시 불러온다", async () => {
    const calls = mockFetch({
      "GET /api/v1/sounds/facets": json(FACETS),
      "GET /api/v1/sounds": json({ items: [], nextCursor: null }),
    });
    render(<SoundsScreen initial={DEFAULT_SOUND_FILTER} />);
    expect(await screen.findByText("맞는 배경음이 없어요")).toBeVisible();

    await userEvent.click(screen.getByRole("radio", { name: "배경음악" }));
    expect(router.replace).toHaveBeenLastCalledWith("/sounds?kind=MUSIC", {
      scroll: false,
    });
    await screen.findByRole("option", { name: "재즈 (8)" });
    expect(
      screen.queryByRole("option", { name: "바닷가 파도 (21)" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "카테고리" }), {
      target: { value: "MUSIC_JAZZ" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "분위기" }), {
      target: { value: "PARTY" },
    });
    await userEvent.type(
      screen.getByRole("searchbox", { name: "장면이나 소리로 찾기" }),
      "비 오는 밤{Enter}",
    );
    expect(router.replace).toHaveBeenLastCalledWith(
      "/sounds?kind=MUSIC&category=MUSIC_JAZZ&mood=PARTY&q=%EB%B9%84+%EC%98%A4%EB%8A%94+%EB%B0%A4",
      { scroll: false },
    );
    expect(
      calls.some((c) =>
        c.url.includes(
          "/api/v1/sounds?kind=MUSIC&category=MUSIC_JAZZ&mood=PARTY&q=",
        ),
      ),
    ).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "조건 지우기" }));
    expect(router.replace).toHaveBeenLastCalledWith("/sounds?kind=MUSIC", {
      scroll: false,
    });
  });

  it("상세는 플레이어, 설명, 장소, 출처와 라이선스, 비슷한 소리를 보여 준다", async () => {
    mockFetch({
      [`GET /api/v1/sounds/${ID}`]: json({
        sound: sound(1, { id: ID }),
        similar: [sound(3)],
      }),
    });
    const { container } = render(<SoundScreen id={ID} />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "파도1" }),
    ).toBeVisible();
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      `/api/images/sounds/${ID}`,
    );
    expect(screen.getByText("어울리는 장소: 바닷가")).toBeVisible();
    expect(screen.getByText("출처와 라이선스")).toBeVisible();
    expect(screen.getByRole("link", { name: "파도3" })).toHaveAttribute(
      "href",
      "/sounds/s3",
    );
  });

  it("상세를 못 불러오면 오류를 보여 준다", async () => {
    mockFetch({});
    render(<SoundScreen id={ID} />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "배경음",
    );
  });
});

describe("배경음 조건", () => {
  it("주소 쿼리를 읽고 모르는 값은 버린다", () => {
    expect(
      parseSoundFilter({ kind: "MUSIC", category: "bad code", mood: ["SAD"] }),
    ).toEqual({ kind: "MUSIC", category: "", mood: "SAD", q: "" });
    expect(parseSoundFilter({ kind: "NOISE", q: "파도" })).toEqual({
      ...DEFAULT_SOUND_FILTER,
      q: "파도",
    });
    expect(soundFilterQuery(DEFAULT_SOUND_FILTER)).toBe("");
    expect(soundApiPath({ ...DEFAULT_SOUND_FILTER, q: " 비 " })).toBe(
      "/sounds?q=%EB%B9%84&size=30",
    );
    expect(durationLabel(65_400)).toBe("1:05");
    expect(durationLabel(100)).toBe("0:01");
  });
});
