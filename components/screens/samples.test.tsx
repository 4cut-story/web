import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SamplesScreen } from "./samples-screen";
import { router } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";
import { SAMPLES } from "@/lib/samples";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const AUDIO = () =>
  new Response(new Uint8Array(1_000_000), {
    headers: { "content-type": "audio/mpeg" },
  });

const ROUTES = {
  "GET /samples/": AUDIO,
  "PUT /api/uploads/v1/": noContent(),
  "POST /api/v1/conversations/v1/finish": json({ status: "QUEUED" }, 202),
  "POST /api/v1/conversations": json({ id: "v1", status: "RECORDING" }, 201),
};

beforeEach(() => router.push.mockReset());

describe("샘플로 만들어 보기 (데모)", () => {
  it("샘플마다 제목·요약·미리 듣기를 보여 준다", () => {
    mockFetch(ROUTES);
    render(<SamplesScreen />);
    for (const sample of SAMPLES) {
      expect(
        screen.getByRole("heading", { name: sample.title }),
      ).toBeInTheDocument();
      expect(screen.getByText(sample.summary)).toBeInTheDocument();
      expect(
        screen.getByLabelText(`${sample.title} 미리 듣기`),
      ).toHaveAttribute("src", `/samples/${sample.id}.mp3`);
    }
    expect(screen.getByRole("link", { name: "만들기로" })).toHaveAttribute(
      "href",
      "/record",
    );
  });

  it("고른 샘플을 받아 올리기와 같은 길로 보내고 진행 화면으로 간다", async () => {
    const calls = mockFetch(ROUTES);
    render(<SamplesScreen />);
    await userEvent.click(screen.getByRole("radio", { name: "무협" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "이 대화로 만들기" })[1],
    );
    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/conversations/v1"),
    );
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET /samples/grandma.mp3",
      "POST /api/v1/conversations",
      "PUT /api/uploads/v1/0",
      "PUT /api/uploads/v1/1",
      "POST /api/v1/conversations/v1/finish",
    ]);
    expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({
      source: "UPLOAD",
      consent: true,
      concept: "WUXIA",
    });
    expect(calls[2].init?.headers).toMatchObject({
      "Content-Type": "audio/mpeg",
    });
  });

  it("샘플을 받지 못하면 알리고 다시 고를 수 있다", async () => {
    const calls = mockFetch({});
    render(<SamplesScreen />);
    const [first] = screen.getAllByRole("button", { name: "이 대화로 만들기" });
    await userEvent.click(first);
    expect(
      await screen.findByText(/샘플을 불러오지 못했어요/),
    ).toBeInTheDocument();
    expect(first).toBeEnabled();
    expect(calls).toHaveLength(1);
  });
});
