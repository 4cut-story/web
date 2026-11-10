import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AmbientLayer } from "@/components/ambient-layer";

describe("화면 효과 층 (FR-043)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("먼 층·중간 층은 인물 뒤 층에, 가까운 층과 그림 전체 빛은 앞에 둔다", () => {
    render(<AmbientLayer types={["leaves", "lightning"]} playing seed="c:1" />);
    const behind = screen.getByTestId("ambient-behind");
    expect(behind.dataset.masked).toBe("false");
    const back = behind.querySelectorAll<HTMLElement>(".ambient");
    expect(back.length).toBeGreaterThan(0);
    back.forEach((el) => expect(el.dataset.layer).not.toBe("2"));
    const layer = screen.getByTestId("ambient");
    const front = Array.from(
      layer.querySelectorAll<HTMLElement>(":scope > .ambient"),
    );
    expect(front.some((el) => el.dataset.ambient === "lightning")).toBe(true);
    expect(
      front.some(
        (el) => el.dataset.ambient === "leaves" && el.dataset.layer === "2",
      ),
    ).toBe(true);
    // 낙엽마다 색·흔들림을 따로 받는다
    const leaf = back[0];
    expect(leaf.style.getPropertyValue("--tint")).toMatch(/^var\(--ambient-/);
    expect(leaf.style.getPropertyValue("--sway")).toMatch(/px$/);
  });

  it("깊이 지도를 읽으면 인물 뒤 층을 가리고, 읽지 못하면 가리지 않는다", async () => {
    const images: { onload: () => void }[] = [];
    class FakeImage {
      naturalWidth = 4;
      naturalHeight = 2;
      onload: () => void = () => {};
      src = "";
      constructor() {
        images.push(this);
      }
    }
    vi.stubGlobal("Image", FakeImage);
    const data = new Uint8ClampedArray(4 * 2 * 4).map((_, i) => i * 3);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: () => {},
      getImageData: () => ({ data }),
      putImageData: () => {},
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,AAAA",
    );
    render(
      <AmbientLayer
        types={["rain"]}
        playing
        seed="c:2"
        depth="/api/images/comics/c?panel=2&frame=depth"
        fit="contain"
      />,
    );
    expect(screen.getByTestId("ambient-behind").dataset.masked).toBe("false");
    await act(async () => images[0].onload());
    const behind = screen.getByTestId("ambient-behind");
    expect(behind.dataset.masked).toBe("true");
    expect(behind.style.maskImage).toContain("data:image/png");
    expect(behind.style.maskSize).toBe("contain");
  });

  it("효과가 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<AmbientLayer types={[]} playing={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
