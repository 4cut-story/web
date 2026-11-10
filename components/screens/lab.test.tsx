import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LabScreen } from "./lab-screen";
import { json, mockFetch } from "@/test/fetch-mock";
import {
  defaultShown,
  orderVariants,
  parseTree,
  isReference,
  rawUrl,
  roundTitle,
  splitByReference,
  summarizeTiming,
  variantLabel,
} from "@/lib/lab";

const R = "eval-out/round29";
const blob = (path: string) => ({ path, type: "blob" });

const TREE = {
  tree: [
    blob("README.md"),
    { path: R, type: "tree" },
    blob(`${R}/round.json`),
    blob(`${R}/panels.json`),
    blob(`${R}/schnell-nf4/love-07-panel-2.png`),
    blob(`${R}/schnell-nf4/love-07-panel-1.png`),
    blob(`${R}/schnell-nf4/solo-01-panel-1.png`),
    blob(`${R}/schnell-nf4/timing.json`),
    blob(`${R}/schnell-nf4/scores.json`),
    blob(`${R}/dev-nf4/love-07-panel-1.png`),
    blob(`${R}/dev-nf4/timing.json`),
    blob(`${R}/schnell-fp8/timing.json`),
    blob(`${R}/schnell-nf4-ref/love-07-panel-1.png`),
    blob(`${R}/schnell-nf4-ref/scores.json`),
  ],
};

const ROUTES = {
  "GET https://api.github.com/": json(TREE),
  [`GET ${rawUrl(`${R}/round.json`)}`]: json({
    title: "회차 29 그림 모델 비교",
    description: "같은 콘티를 다시 그렸다.",
    baseline: "schnell-nf4",
  }),
  [`GET ${rawUrl(`${R}/panels.json`)}`]: json([
    { name: "love-07-panel-1", comic: "love-07", prompt: "rainy street" },
    { name: "solo-01-panel-1", comic: "solo-01", prompt: "alone" },
  ]),
  [`GET ${rawUrl(`${R}/schnell-nf4/timing.json`)}`]: json({
    model: "black-forest-labs/FLUX.1-schnell",
    quant: "nf4",
    steps: 4,
    loadSeconds: 45.4,
    peakVramGiB: 6.64,
    panelSeconds: { "love-07-panel-1": 8, "love-07-panel-2": 10 },
  }),
  [`GET ${rawUrl(`${R}/schnell-nf4/scores.json`)}`]: json({
    label: "schnell NF4",
    status: "기준",
    scores: [90.2, 91.4],
    average: 90.8,
    criticalComics: 5,
    perComic: { "love-07": 87.1 },
    note: "지금 운영 중.",
  }),
  [`GET ${rawUrl(`${R}/schnell-nf4-ref/scores.json`)}`]: json({
    label: "schnell NF4 참조",
    status: "채택",
    average: 92.5,
  }),
  [`GET ${rawUrl(`${R}/dev-nf4/timing.json`)}`]: json({
    model: "black-forest-labs/FLUX.1-dev",
    quant: "nf4",
    steps: 28,
    failed: { "solo-01-panel-1": "oom" },
    aborted: "느려서 멈춤",
  }),
};

describe("그림 모델 비교 (/lab)", () => {
  it("제목 앞 ‹ 링크는 첫 화면(/)으로 간다", () => {
    mockFetch(ROUTES);
    render(<LabScreen />);
    expect(screen.getByRole("link", { name: "첫 화면으로" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("방식별 점수표와 고른 편의 컷을 나란히 보여 준다", async () => {
    mockFetch(ROUTES);
    render(<LabScreen />);
    expect(
      await screen.findByRole("heading", { name: "회차 29 그림 모델 비교" }),
    ).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "참조 없이 그림" });
    expect(within(table).getByText("90.8")).toBeInTheDocument();
    expect(within(table).queryByText("92.5")).not.toBeInTheDocument();
    const ref = screen.getByRole("table", { name: "캐릭터 참조로 그림" });
    expect(within(ref).getByText("92.5")).toBeInTheDocument();
    expect(
      within(ref).getByRole("rowheader", { name: "schnell NF4 참조" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("기준")).toBeInTheDocument();
    // 채택만 채운 초록 배지로 다른 판단과 색이 다르다
    expect(within(ref).getByText("채택")).toHaveClass("bg-success");
    expect(within(table).getByText("기준")).not.toHaveClass("bg-success");
    expect(within(table).getByText(/실패 1/)).toBeInTheDocument();
    // 회차 요약에 지금 쓰는 방식을 따로 보인다
    expect(screen.getByText("지금 쓰는 방식")).toBeInTheDocument();
    expect(screen.getByText(/느려서 멈춤/)).toBeInTheDocument();

    // 처음에는 채택한 방식만 골라 그 컷만 받는다
    expect(screen.getByAltText("schnell NF4 참조 1컷")).toBeInTheDocument();
    expect(screen.queryByAltText("schnell NF4 1컷")).not.toBeInTheDocument();
    expect(screen.queryByAltText("dev NF4 1컷")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "schnell NF4 참조" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "dev NF4" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await userEvent.click(screen.getByRole("button", { name: "모두 고르기" }));
    const first = screen.getByAltText("schnell NF4 1컷");
    expect(first).toHaveAttribute(
      "src",
      rawUrl(`${R}/schnell-nf4/love-07-panel-1.png`),
    );
    expect(screen.getByAltText("dev NF4 1컷")).toBeInTheDocument();
    expect(screen.getByText(/이 편 87.1점/)).toBeInTheDocument();
    expect(screen.getAllByText("그림 없음")).toHaveLength(2);
    expect(screen.getByText("rainy street")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "schnell NF4 참조" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "dev NF4" }));
    expect(screen.queryByAltText("dev NF4 1컷")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "schnell NF4" }));
    expect(
      screen.getByText("고른 편을 그린 방식이 없어요."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "solo-01" }));
    await userEvent.click(screen.getByRole("button", { name: "schnell NF4" }));
    expect(screen.getByAltText("schnell NF4 1컷")).toHaveAttribute(
      "src",
      rawUrl(`${R}/schnell-nf4/solo-01-panel-1.png`),
    );

    await userEvent.click(screen.getByRole("button", { name: "채택만" }));
    expect(screen.queryByAltText("schnell NF4 1컷")).not.toBeInTheDocument();
  });

  it("채택한 방식이 없으면 점수가 가장 높은 방식 하나만 처음에 고른다", () => {
    const v = (id: string, extra: object = {}) => ({
      id,
      comics: {},
      ...extra,
    });
    expect([
      ...defaultShown([
        v("a", { scores: { average: 80 } }),
        v("b", { scores: { average: 90 } }),
      ]),
    ]).toEqual(["b"]);
    expect([
      ...defaultShown([v("a"), v("b", { scores: { status: "채택" } })]),
    ]).toEqual(["b"]);
    expect(defaultShown([]).size).toBe(0);
  });

  it("한 컷도 못 그려 점수가 null인 방식이 있어도 화면이 깨지지 않는다", async () => {
    mockFetch({
      ...ROUTES,
      "GET https://api.github.com/": json({
        tree: [...TREE.tree, blob(`${R}/broken-ref/scores.json`)],
      }),
      [`GET ${rawUrl(`${R}/broken-ref/scores.json`)}`]: json({
        label: "못 그린 방식",
        status: "실패(그리지 못함)",
        reference: true,
        scores: [],
        average: null,
        criticalComics: null,
        perComic: {},
      }),
    });
    render(<LabScreen />);
    const ref = await screen.findByRole("table", {
      name: "캐릭터 참조로 그림",
    });
    const row = within(ref)
      .getByRole("rowheader", { name: "못 그린 방식" })
      .closest("tr")!;
    expect(within(row).getAllByText("–").length).toBeGreaterThan(0);
  });

  it("회차가 여럿이면 고를 수 있다", async () => {
    mockFetch({
      ...ROUTES,
      "GET https://api.github.com/": json({
        tree: [...TREE.tree, blob("eval-out/round30/x/a-panel-1.png")],
      }),
    });
    render(<LabScreen />);
    await userEvent.click(
      await screen.findByRole("button", { name: "회차 29" }),
    );
    expect(
      await screen.findByRole("heading", { name: "회차 29 그림 모델 비교" }),
    ).toBeInTheDocument();
  });

  it("목록을 못 받으면 오류를 보인다", async () => {
    mockFetch({});
    render(<LabScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "테스트 기록을 불러오지 못했어요",
    );
  });

  it("참조로 그린 방식을 표시나 폴더 이름으로 가려 각각 점수 순으로 둔다", () => {
    const v = (id: string, extra: object = {}) => ({
      id,
      comics: {},
      ...extra,
    });
    expect(isReference(v("dev-nf4-ref"))).toBe(true);
    expect(isReference(v("ref-schnell"))).toBe(true);
    expect(isReference(v("dev-nf4-prefer"))).toBe(false);
    expect(isReference(v("a", { timing: { reference: true } }))).toBe(true);
    expect(isReference(v("a-ref", { scores: { reference: false } }))).toBe(
      false,
    );
    const { plain, reference } = splitByReference([
      v("low", { scores: { average: 70 } }),
      v("x-ref", { scores: { average: 80 } }),
      v("high", { scores: { average: 90 } }),
      v("none"),
      v("y-ref", { scores: { average: 95 } }),
    ]);
    expect(plain.map((x) => x.id)).toEqual(["high", "low", "none"]);
    expect(reference.map((x) => x.id)).toEqual(["y-ref", "x-ref"]);
  });

  it("폴더 구조를 회차·방식·편으로 나누고 컷 순서대로 둔다", () => {
    const [round] = parseTree(TREE.tree.map((t) => t.path));
    expect(round.id).toBe("round29");
    expect(round.variants.get("schnell-nf4")!.comics["love-07"]).toEqual([
      `${R}/schnell-nf4/love-07-panel-1.png`,
      `${R}/schnell-nf4/love-07-panel-2.png`,
    ]);
    expect(summarizeTiming(undefined)).toEqual({ drawn: 0, failed: 0 });
    expect(variantLabel({ id: "x", comics: {} })).toBe("x");
    expect(roundTitle({ id: "custom" })).toBe("custom");
    const order = orderVariants(
      [
        { id: "b", comics: {} },
        { id: "a", comics: {}, scores: { average: 80 } },
        { id: "base", comics: {} },
      ],
      "base",
    );
    expect(order.map((v) => v.id)).toEqual(["base", "a", "b"]);
  });
});
