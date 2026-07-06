import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PhotoCarousel } from "./photo-carousel";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

describe("PhotoCarousel", () => {
  it("renders one slide and one dot per photo", () => {
    render(
      <PhotoCarousel name="Sazón" photos={["/a.jpg", "/b.jpg", "/c.jpg"]} />,
    );
    expect(screen.getAllByTestId("carousel-slide")).toHaveLength(3);
    expect(screen.getAllByTestId("carousel-dot")).toHaveLength(3);
  });

  it("renders each photo with the commerce name as alt text", () => {
    render(<PhotoCarousel name="Sazón de la Abuela" photos={["/a.jpg"]} />);
    expect(screen.getByAltText(/Sazón de la Abuela/)).toBeDefined();
  });

  it("shows a single gradient placeholder and no dots when there is no photo", () => {
    render(<PhotoCarousel name="Sazón" photos={[]} />);
    const slides = screen.getAllByTestId("carousel-slide");
    expect(slides).toHaveLength(1);
    expect(slides[0].getAttribute("data-placeholder")).toBe("true");
    expect(screen.queryAllByTestId("carousel-dot")).toHaveLength(0);
  });

  it("marks the first dot active initially", () => {
    render(<PhotoCarousel name="X" photos={["/a.jpg", "/b.jpg"]} />);
    const dots = screen.getAllByTestId("carousel-dot");
    expect(dots[0].getAttribute("data-active")).toBe("true");
    expect(dots[1].getAttribute("data-active")).toBe("false");
  });
});
