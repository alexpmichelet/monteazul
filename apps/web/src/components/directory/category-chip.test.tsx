import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CATEGORY_CHIP_BY_KEY } from "@/lib/categories";
import { CategoryChip } from "./category-chip";

describe("CategoryChip", () => {
  it("renders the chip label", () => {
    render(<CategoryChip chip={CATEGORY_CHIP_BY_KEY.comida} />);
    expect(screen.getByText("Comida")).toBeDefined();
  });

  it("reflects the active state via a data attribute", () => {
    const { rerender } = render(
      <CategoryChip chip={CATEGORY_CHIP_BY_KEY.comida} active />,
    );
    expect(
      screen.getByRole("button").getAttribute("data-active"),
    ).toBe("true");

    rerender(<CategoryChip chip={CATEGORY_CHIP_BY_KEY.comida} />);
    expect(
      screen.getByRole("button").getAttribute("data-active"),
    ).toBe("false");
  });

  it("calls onSelect with the chip key when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CategoryChip chip={CATEGORY_CHIP_BY_KEY.mascotas} onSelect={onSelect} />,
    );

    await user.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledWith("mascotas");
  });
});
