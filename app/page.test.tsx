import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("첫 화면 (임시)", () => {
  it("서비스 이름과 시작 버튼을 보여 준다", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "4컷 이야기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "시작하기" }),
    ).toBeInTheDocument();
  });
});
