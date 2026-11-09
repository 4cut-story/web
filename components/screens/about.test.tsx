import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AboutScreen } from "./about-screen";
import AboutPage, { metadata } from "@/app/about/page";
import { Landing } from "@/components/landing";
import {
  CHARACTER_IMAGES,
  CHARACTER_SEARCH,
  CHARACTER_SEARCH_NEXT,
  DECISIONS,
  MODELS,
  SERVICES,
  TUNINGS,
} from "@/lib/about";
import { json, mockFetch } from "@/test/fetch-mock";
import { OTHER, post } from "@/test/screen";

beforeEach(() => {
  mockFetch({});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("서비스 소개 페이지", () => {
  it("직접 만든 Crowfoot과 nginx-manager를 소개하고 사이트와 GitHub로 이어 준다", () => {
    render(<AboutScreen />);
    const tools = screen.getByRole("region", {
      name: "직접 만든 도구로 설계하고 연결했어요",
    });
    expect(within(tools).getAllByText("직접 만듦")).toHaveLength(2);
    expect(
      within(tools).getByRole("link", { name: "Crowfoot 사이트 열기" }),
    ).toHaveAttribute("href", "https://crowfoot.java21.net");
    expect(
      within(tools).getByRole("link", { name: "Crowfoot GitHub 열기" }),
    ).toHaveAttribute("href", "https://github.com/crowfoot-erd");
    expect(
      within(tools).getByRole("link", { name: "nginx-manager GitHub 열기" }),
    ).toHaveAttribute("href", "https://github.com/nginx-manager");
    expect(
      within(tools).getByText(/표 14개, 요구사항 16개/),
    ).toBeInTheDocument();
    expect(
      within(tools).getByText(
        "이 서비스의 도메인 연결을 nginx-manager로 했어요",
      ),
    ).toBeInTheDocument();
  });

  it("아키텍처부터 용어 풀이까지 구역을 차례로 보여 준다", () => {
    render(<AboutScreen />);
    expect(
      screen.getByRole("heading", { level: 1, name: "서비스 소개" }),
    ).toBeInTheDocument();
    for (const name of [
      "실제로 만들어진 4컷",
      "전체 아키텍처",
      "설계 결정과 대안",
      "생성 흐름",
      "캐릭터 찾기",
      "하드웨어 환경",
      "사용한 AI 모델",
      "성능 개선과 문제 해결",
      "기술 스택과 품질 기준",
      "용어 풀이",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("전체 아키텍처 그림")).toBeInTheDocument();
    expect(screen.getByText(/회고: 16GB 한 장으로/)).toBeInTheDocument();
  });

  it("서비스, 설계 결정, 캐릭터 찾기 단계를 모두 적는다", () => {
    render(<AboutScreen />);
    const arch = screen.getByRole("region", { name: "전체 아키텍처" });
    for (const s of SERVICES) {
      expect(within(arch).getAllByText(s.name).length).toBeGreaterThan(0);
    }
    const decisions = screen.getByRole("region", { name: "설계 결정과 대안" });
    for (const d of DECISIONS) {
      expect(within(decisions).getByText(d.title)).toBeInTheDocument();
    }
    const search = screen.getByRole("region", { name: "캐릭터 찾기" });
    for (const step of CHARACTER_SEARCH) {
      expect(within(search).getByText(step.title)).toBeInTheDocument();
    }
    expect(within(search).getByText("0.30 (채택)")).toBeInTheDocument();
    expect(within(search).getByText("향후 개선")).toBeInTheDocument();
    for (const item of CHARACTER_SEARCH_NEXT) {
      expect(within(search).getByText(item)).toBeInTheDocument();
    }
  });

  it("모델마다 크기·왜 골랐나·설정값을, 개선마다 원인과 전후 비교를 적는다", () => {
    render(<AboutScreen />);
    const models = screen.getByRole("region", { name: "사용한 AI 모델" });
    for (const m of MODELS) {
      expect(within(models).getAllByText(m.name).length).toBeGreaterThan(0);
      expect(within(models).getByText(m.why)).toBeInTheDocument();
    }
    expect(within(models).getByLabelText("LLM 대체 순서")).toBeInTheDocument();
    const tuning = screen.getByRole("region", {
      name: "성능 개선과 문제 해결",
    });
    for (const t of TUNINGS) {
      expect(within(tuning).getByText(t.cause)).toBeInTheDocument();
      expect(within(tuning).getByText(t.after)).toBeInTheDocument();
    }
    expect(CHARACTER_IMAGES).toBe(42546);
    expect(screen.getAllByText(/42,546장/).length).toBeGreaterThan(0);
  });

  it("내부 IP 주소, 내부 호스트 이름, 운영 기관, 추정 표현을 싣지 않는다", () => {
    const { container } = render(<AboutScreen />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    // 공개 사이트인 Crowfoot 주소만 보여 주고, 다른 내부 호스트 이름은 싣지 않는다.
    expect(text.replaceAll("crowfoot.java21.net", "")).not.toMatch(
      /java21\.net/,
    );
    expect(text).not.toMatch(/학교/);
    expect(text).not.toMatch(/추정/);
    expect(text).not.toMatch(/포트폴리오/);
  });

  it("최근 공개 4컷을 실제 예시로 보여 준다", async () => {
    mockFetch({
      "GET /api/v1/feed": json({ items: [post()], nextCursor: null }),
      "GET /api/v1/users": json({ items: [OTHER] }),
    });
    render(<AboutScreen />);
    const examples = screen.getByRole("region", {
      name: "실제로 만들어진 4컷",
    });
    expect(
      await within(examples).findByText("편의점 대소동"),
    ).toBeInTheDocument();
  });

  it("예시를 불러오지 못하면 안내 문구를 보여 준다", async () => {
    render(<AboutScreen />);
    expect(
      await screen.findByText("아직 보여 드릴 공개 4컷이 없어요."),
    ).toBeInTheDocument();
  });

  it("GitHub과 첫 화면으로 가는 길을 둔다", () => {
    render(<AboutPage />);
    expect(metadata.title).toBe("서비스 소개 · 4cut story");
    expect(
      screen.getByRole("link", { name: "4컷 만들러 가기" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "첫 화면으로" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("소개 페이지로 가는 링크", () => {
  it("첫 화면 히어로 아래에서 소개 페이지로 간다", () => {
    const { container } = render(<Landing signedIn={false} posts={[]} />);
    expect(
      screen.getByRole("link", { name: /이 서비스는 어떻게 만들었을까요/ }),
    ).toHaveAttribute("href", "/about");
    expect(container.textContent).not.toMatch(/포트폴리오/);
  });

  it("소개 링크 바로 아래에서 기사로 만들기로 가고, 로그인하면 히어로에도 버튼이 있다", () => {
    const { unmount } = render(<Landing signedIn={false} posts={[]} />);
    const links = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(links.indexOf("/article")).toBe(links.indexOf("/about") + 1);
    expect(
      screen.getByRole("link", { name: /뉴스 기사도 4컷 만화가 돼요/ }),
    ).toHaveAttribute("href", "/article");
    unmount();
    render(<Landing signedIn posts={[]} />);
    expect(screen.getByRole("link", { name: "기사로 만들기" })).toHaveAttribute(
      "href",
      "/article",
    );
  });

  it("바닥글에 소개 링크가 GitHub 링크와 나란히 있다", () => {
    render(<AboutScreen />);
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "서비스 소개 · 기술 스택" }),
    ).toHaveAttribute("href", "/about");
    expect(
      within(footer).getByRole("link", { name: "그림 모델 비교" }),
    ).toHaveAttribute("href", "/lab");
    expect(
      within(footer).getByRole("link", { name: "GitHub에서 소스 보기" }),
    ).toBeInTheDocument();
  });
});
