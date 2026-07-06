import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CommerceCardSkeleton } from "./commerce-card-skeleton";

describe("CommerceCardSkeleton", () => {
  it("renders a labelled skeleton placeholder", () => {
    render(<CommerceCardSkeleton />);
    const root = screen.getByTestId("commerce-card-skeleton");
    expect(root.getAttribute("data-slot")).toBe("commerce-card-skeleton");
  });

  it("is composed of several shimmering skeleton blocks", () => {
    render(<CommerceCardSkeleton />);
    const root = screen.getByTestId("commerce-card-skeleton");
    const blocks = root.querySelectorAll('[data-slot="skeleton"]');
    expect(blocks.length).toBeGreaterThan(1);
  });
});
