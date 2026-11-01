import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ComicScreen } from "./comic-screen";
import { LoginScreen } from "./login-screen";
import { POLL_MS, ProgressScreen } from "./progress-screen";
import { comic, router } from "@/test/screen";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  router.push.mockReset();
});

function conversation(overrides: Record<string, unknown>) {
  return {
    id: "v1",
    source: "RECORDING",
    status: "TRANSCRIBING",
    stage: "TRANSCRIBING",
    progress: 10,
    retries: 0,
    failureReason: null,
    comicId: null,
    createdAt: "2026-10-31T00:00:00Z",
    ...overrides,
  };
}

describe("로그인 화면", () => {
  it("로그인 방식을 받아 오지 못하면 안내한다", async () => {
    mockFetch({ "GET /api/providers": json({ items: [], devLogin: false }) });
    render(<LoginScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "로그인 서버에 닿지 못했어요",
    );
  });

  it("로그인 없이 첫 화면으로 돌아갈 수 있다", () => {
    mockFetch({ "GET /api/providers": json({ items: [], devLogin: false }) });
    render(<LoginScreen />);
    expect(
      screen.getByRole("link", { name: "로그인 없이 만화 구경하기" }),
    ).toHaveAttribute("href", "/");
  });

  it("목록 응답이 깨져도 안내한다", async () => {
    mockFetch({ "GET /api/providers": new Response("x") });
    render(<LoginScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "로그인 서버에 닿지 못했어요",
    );
  });

  it("켜진 공급자 버튼과 오류를 보여 준다", async () => {
    mockFetch({
      "GET /api/providers": json({
        items: ["github", "google"],
        devLogin: false,
      }),
    });
    render(<LoginScreen error="PROVIDER_NOT_CONFIGURED" />);
    expect(
      await screen.findByRole("link", { name: "GitHub로 계속하기" }),
    ).toHaveAttribute("href", "/auth/login/github");
    expect(
      screen.getByRole("link", { name: "Google로 계속하기" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("준비 중");
  });

  it("개발용 로그인을 할 수 있고 실패하면 알린다", async () => {
    const calls = mockFetch({
      "GET /api/providers": json({ items: [], devLogin: true }),
      "POST /auth/dev-login": json({}, 404),
    });
    render(<LoginScreen error="SOMETHING" />);
    await userEvent.type(
      await screen.findByLabelText("개발용 닉네임"),
      "marco",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "개발용 로그인" }),
    );
    expect(
      await screen.findByText("개발용 로그인에 실패했어요."),
    ).toBeInTheDocument();
    expect(calls[1].init?.body).toBe('{"nickname":"marco"}');
    expect(screen.getByText(/로그인하지 못했어요/)).toBeInTheDocument();
  });
});

describe("진행 상태 (FR-008)", () => {
  it("단계를 보여 주고 5초마다 다시 확인해 끝나면 만화 보기를 보여 준다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let n = 0;
    mockFetch({
      "GET /api/v1/conversations/v1": () =>
        json(
          n++ === 0
            ? conversation({
                status: "GPU_WAITING",
                stage: "DRAWING",
                progress: 70,
              })
            : conversation({
                status: "DONE",
                stage: "DONE",
                progress: 100,
                comicId: "c1",
              }),
        ),
    });
    render(<ProgressScreen id="v1" />);
    expect(await screen.findByText(/잠시 쉬고 있어요/)).toBeInTheDocument();
    expect(screen.getByText(/화면을 닫아도 계속 만들어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "만화함으로" })).toHaveAttribute(
      "href",
      "/comics",
    );
    expect(screen.getByText("전사").closest("li")).toHaveAttribute(
      "data-state",
      "done",
    );
    expect(screen.getByText("그림").closest("li")).toHaveAttribute(
      "data-state",
      "running",
    );
    expect(screen.getByText("합성").closest("li")).toHaveAttribute(
      "data-state",
      "waiting",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS);
    });
    expect(
      await screen.findByRole("link", { name: "만화 보기" }),
    ).toHaveAttribute("href", "/comics/c1");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(
      screen.queryByText(/화면을 닫아도 계속 만들어요/),
    ).not.toBeInTheDocument();
  });

  it("실패와 장면 없음을 알리고 다시 녹음하게 한다", async () => {
    mockFetch({
      "GET /api/v1/conversations/v1": json(
        conversation({
          status: "FAILED",
          stage: "SCRIPTING",
          failureReason: "LLM_TIMEOUT",
        }),
      ),
      "GET /api/v1/conversations/v2": json(
        conversation({ id: "v2", status: "NO_SCENE", stage: "SELECTING" }),
      ),
    });
    const { unmount } = render(<ProgressScreen id="v1" />);
    expect(await screen.findByText(/만들지 못했어요/)).toHaveTextContent(
      "LLM_TIMEOUT",
    );
    expect(screen.getByText("콘티").closest("li")).toHaveAttribute(
      "data-state",
      "failed",
    );
    unmount();
    render(<ProgressScreen id="v2" />);
    expect(await screen.findByText(/장면을 찾지 못했어요/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "다시 녹음하기" }),
    ).toBeInTheDocument();
  });
});

describe("만화 보기와 게시 (FR-013, FR-014)", () => {
  it("실명 경고를 보고 동의한 뒤 올리면 게시물로 간다", async () => {
    const calls = mockFetch({
      "GET /api/v1/comics/c1": json(comic({ nameWarnings: ["김철수"] })),
      "POST /api/v1/posts": json({ postId: "p9" }, 201),
    });
    render(<ComicScreen id="c1" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "올리기" }),
    );
    const sheet = screen.getByRole("dialog", { name: "게시하기" });
    expect(sheet).toHaveTextContent("김철수");
    expect(screen.getByText("93자 남음")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "팔로워만" }));
    const submit = screen.getAllByRole("button", { name: "올리기" }).at(-1)!;
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/게시에 동의했어요/));
    await userEvent.click(submit);
    expect(router.push).toHaveBeenCalledWith("/posts/p9");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      comicId: "c1",
      caption: "편의점 대소동",
      visibility: "FOLLOWERS",
      participantsConsented: true,
    });
  });

  it("게시가 거절되면 이유를 보여 주고, 바깥을 누르면 닫는다", async () => {
    mockFetch({
      "GET /api/v1/comics/c1": json(comic()),
      "POST /api/v1/posts": json(
        { error: { code: "CONSENT_REQUIRED", message: "동의가 필요해요." } },
        400,
      ),
    });
    render(<ComicScreen id="c1" />);
    await userEvent.click(
      await screen.findByRole("button", { name: "올리기" }),
    );
    await userEvent.click(screen.getByLabelText(/게시에 동의했어요/));
    await userEvent.type(screen.getByLabelText(/캡션/), "!");
    await userEvent.click(
      screen.getAllByRole("button", { name: "올리기" }).at(-1)!,
    );
    expect(await screen.findByText("동의가 필요해요.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("게시한 만화는 게시물 보기, 저장 링크, 삭제 확인 뒤 만화함으로", async () => {
    mockFetch({
      "GET /api/v1/comics/c1": json(comic({ state: "POSTED", postId: "p1" })),
      "DELETE /api/v1/comics/c1": noContent(),
    });
    render(<ComicScreen id="c1" />);
    expect(
      await screen.findByRole("link", { name: "게시물 보기" }),
    ).toHaveAttribute("href", "/posts/p1");
    expect(screen.getByRole("link", { name: "저장" })).toHaveAttribute(
      "download",
    );
    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "삭제" }).at(-1)!,
    );
    expect(router.push).toHaveBeenCalledWith("/comics");
  });

  it("삭제가 실패하면 알린다", async () => {
    mockFetch({
      "GET /api/v1/comics/c1": json(comic()),
      "DELETE /api/v1/comics/c1": json(
        { error: { code: "X", message: "삭제 실패" } },
        500,
      ),
    });
    render(<ComicScreen id="c1" />);
    await userEvent.click(await screen.findByRole("button", { name: "삭제" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "삭제" }).at(-1)!,
    );
    expect(await screen.findByText("삭제 실패")).toBeInTheDocument();
  });
});
