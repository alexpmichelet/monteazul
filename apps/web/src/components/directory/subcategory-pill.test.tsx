import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SubcategoryPill } from "./subcategory-pill";

describe("SubcategoryPill", () => {
  it("renders its children", () => {
    render(<SubcategoryPill>Panadería y repostería</SubcategoryPill>);
    expect(screen.getByText("Panadería y repostería")).toBeDefined();
  });

  it("tags itself with a design-system data-slot", () => {
    render(<SubcategoryPill>Barbería</SubcategoryPill>);
    expect(
      screen.getByText("Barbería").getAttribute("data-slot"),
    ).toBe("subcategory-pill");
  });
});
