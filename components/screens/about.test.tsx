import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutScreen } from "./about-screen";
import AboutPage, { metadata } from "@/app/about/page";
import { Landing } from "@/components/landing";
import { MODELS, PIPELINE, TUNINGS } from "@/lib/about";

describe("서비스 소개 페이지", () => {
  it("아키텍처, 흐름, 하드웨어, 모델, 튜닝, 스택 구역을 차례로 보여 준다", () => {
    render(<AboutScreen />);
    expect(
      screen.getByRole("heading", { level: 1, name: "서비스 소개" }),
    ).toBeInTheDocument();
    for (const name of [
      "전체 아키텍처",
      "생성 흐름",
      "하드웨어 환경",
      "사용한 AI 모델",
      "튜닝한 부분",
      "기술 스택과 품질 기준",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(
      screen.getByText(/RTX 5060 Ti 16GB \(Blackwell/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("전체 아키텍처 그림")).toBeInTheDocument();
  });

  it("모델마다 용도·크기·실행 위치를, 튜닝마다 결과를 적는다", () => {
    render(<AboutScreen />);
    const models = screen.getByRole("region", { name: "사용한 AI 모델" });
    for (const m of MODELS) {
      expect(within(models).getByText(m.name)).toBeInTheDocument();
      expect(within(models).getAllByText(m.size).length).toBeGreaterThan(0);
    }
    const tuning = screen.getByRole("region", { name: "튜닝한 부분" });
    for (const t of TUNINGS) {
      expect(within(tuning).getByText(t.result)).toBeInTheDocument();
    }
    const flow = screen.getByRole("region", { name: "생성 흐름" });
    expect(within(flow).getAllByRole("listitem").length).toBeGreaterThan(
      PIPELINE.length,
    );
  });

  it("내부 IP 주소, 내부 호스트 이름, 운영 기관을 싣지 않는다", () => {
    const { container } = render(<AboutScreen />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    expect(text).not.toMatch(/java21\.net/);
    expect(text).not.toMatch(/학교/);
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
  it("첫 화면 히어로 아래와 바닥글 GitHub 옆에서 소개 페이지로 간다", () => {
    render(<Landing signedIn={false} posts={[]} />);
    expect(
      screen.getByRole("link", { name: /이 서비스는 어떻게 만들었을까요/ }),
    ).toHaveAttribute("href", "/about");
  });

  it("바닥글에 소개 링크가 GitHub 링크와 나란히 있다", () => {
    render(<AboutScreen />);
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "서비스 소개 · 기술 스택" }),
    ).toHaveAttribute("href", "/about");
    expect(
      within(footer).getByRole("link", { name: "GitHub에서 소스 보기" }),
    ).toBeInTheDocument();
  });
});
