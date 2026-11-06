import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterScreen } from "./character-screen";
import { CharactersScreen } from "./characters-screen";
import { DEFAULT_FILTER } from "@/lib/characters";
import { router } from "@/test/screen";
import { json, mockFetch } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  router.replace.mockReset();
});

const ID = "V1StGXR8_Z5jdHi6B-myT";

function card(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `c${n}`,
    name: `캐릭터${n}`,
    description: "설명",
    job: "의사",
    gender: "FEMALE",
    ageGroup: "YOUNG",
    coverLookId: `look${n}`,
    ...overrides,
  };
}

describe("캐릭터 갤러리", () => {
  it("캐릭터를 표지 그림과 함께 격자로 보여 주고, 더 보기로 이어 붙인다", async () => {
    const calls = mockFetch({
      "GET /api/v1/characters/jobs": json([{ job: "의사", count: 2 }]),
      "GET /api/v1/characters?concept=DAILY&size=48&cursor=n1": json({
        items: [card(2, { coverLookId: null })],
        nextCursor: null,
      }),
      "GET /api/v1/characters?concept=DAILY&size=48": json({
        items: [card(1)],
        nextCursor: "n1",
      }),
    });
    render(<CharactersScreen initial={DEFAULT_FILTER} />);
    const first = await screen.findByRole("link", { name: /캐릭터1/ });
    expect(first).toHaveAttribute("href", "/characters/c1");
    expect(within(first).getByRole("img")).toHaveAttribute(
      "src",
      "/api/images/looks/look1",
    );
    expect(first).toHaveTextContent("청년 · 여성 · 의사");
    expect(
      await screen.findByRole("option", { name: "의사 (2)" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
    expect(
      await screen.findByRole("link", { name: /캐릭터2/ }),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("cursor=n1"))).toBe(true);
  });

  it("테마·직업·나이·성별·이름 조건을 주소에 남기고 다시 불러온다", async () => {
    const calls = mockFetch({
      "GET /api/v1/characters/jobs": json([{ job: "의사", count: 2 }]),
      "GET /api/v1/characters": json({ items: [], nextCursor: null }),
    });
    render(<CharactersScreen initial={DEFAULT_FILTER} />);
    expect(await screen.findByText("맞는 캐릭터가 없어요")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "무협" }));
    expect(router.replace).toHaveBeenLastCalledWith("/characters?theme=WUXIA", {
      scroll: false,
    });
    await screen.findByRole("option", { name: "의사 (2)" });
    fireEvent.change(screen.getByRole("combobox", { name: "직업" }), {
      target: { value: "의사" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "나이대" }), {
      target: { value: "OLD" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "성별" }), {
      target: { value: "MALE" },
    });
    await userEvent.type(
      screen.getByRole("searchbox", { name: "이름으로 찾기" }),
      "하늘{Enter}",
    );
    expect(router.replace).toHaveBeenLastCalledWith(
      "/characters?theme=WUXIA&job=%EC%9D%98%EC%82%AC&age=OLD&gender=MALE&q=%ED%95%98%EB%8A%98",
      { scroll: false },
    );
    expect(
      calls.some(
        (c) =>
          c.url.includes("concept=WUXIA") &&
          c.url.includes("ageGroup=OLD") &&
          c.url.includes("gender=MALE"),
      ),
    ).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "조건 지우기" }));
    expect(router.replace).toHaveBeenLastCalledWith("/characters?theme=WUXIA", {
      scroll: false,
    });
  });

  it("주소에 있던 직업이 목록에 없어도 고른 채로 둔다, 오류는 알린다", async () => {
    mockFetch({
      "GET /api/v1/characters": json(
        {
          error: {
            code: "UPSTREAM_ERROR",
            message: "서버 응답에 문제가 있어요.",
          },
        },
        502,
      ),
    });
    render(
      <CharactersScreen
        initial={{ ...DEFAULT_FILTER, theme: "JOSEON", job: "포졸" }}
      />,
    );
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(screen.getByRole("combobox", { name: "직업" })).toHaveValue("포졸");
  });

  it("테마를 고른 채 상세로 가면 그 테마를 주소에 넣는다", async () => {
    mockFetch({
      "GET /api/v1/characters/jobs": json([]),
      "GET /api/v1/characters": json({ items: [card(1)], nextCursor: null }),
    });
    render(
      <CharactersScreen initial={{ ...DEFAULT_FILTER, theme: "ANIMALS" }} />,
    );
    expect(
      await screen.findByRole("link", { name: /캐릭터1/ }),
    ).toHaveAttribute("href", "/characters/c1?theme=ANIMALS");
  });
});

describe("캐릭터 상세", () => {
  const detail = {
    id: ID,
    name: "하늘",
    description: "빨간 단발머리 의사",
    job: "의사",
    gender: "FEMALE",
    ageGroup: "YOUNG",
    looks: [
      {
        id: "l1",
        concept: "DAILY",
        expression: "NEUTRAL",
        look: "young woman, red bob",
      },
      {
        id: "l2",
        concept: "WUXIA",
        expression: "SAD",
        look: "swordswoman crying",
      },
    ],
  };

  it("테마×표정 시트를 보여 주고, 그림을 누르면 크게 본다", async () => {
    mockFetch({ [`GET /api/v1/characters/${ID}`]: json(detail) });
    render(<CharacterScreen id={ID} theme="WUXIA" />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "하늘" }),
    ).toBeInTheDocument();
    expect(screen.getByText("청년 · 여성 · 의사")).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(7);
    const wuxia = screen.getByRole("region", { name: "무협" });
    await userEvent.click(
      within(wuxia).getByRole("button", { name: "하늘 무협 슬픔 크게 보기" }),
    );
    const dialog = screen.getByRole("dialog", { name: "하늘 · 무협 · 슬픔" });
    expect(dialog).toHaveTextContent("swordswoman crying");
    await userEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "하늘 일상 웹툰 기본 크게 보기" }),
    );
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "하늘 일상 웹툰 기본 크게 보기" }),
    );
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("못 찾으면 알린다", async () => {
    mockFetch({
      [`GET /api/v1/characters/${ID}`]: json(
        { error: { code: "NOT_FOUND", message: "캐릭터를 찾을 수 없어요." } },
        404,
      ),
    });
    render(<CharacterScreen id={ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "캐릭터를 찾을 수 없어요.",
    );
  });
});
