import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  it("shows the Spanish placeholder by default", () => {
    render(<SearchBar value="" onValueChange={() => {}} />);
    expect(
      screen.getByPlaceholderText("Buscar negocios o categorías…"),
    ).toBeDefined();
  });

  it("reflects the controlled value", () => {
    render(<SearchBar value="panadería" onValueChange={() => {}} />);
    expect(screen.getByRole<HTMLInputElement>("searchbox").value).toBe(
      "panadería",
    );
  });

  it("emits keystrokes through onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SearchBar value="" onValueChange={onValueChange} />);

    await user.type(screen.getByRole("searchbox"), "a");

    expect(onValueChange).toHaveBeenCalledWith("a");
  });

  it("hides the clear button while empty and shows it once there is a query", () => {
    const { rerender } = render(
      <SearchBar value="" onValueChange={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: /limpiar/i })).toBeNull();

    rerender(<SearchBar value="pan" onValueChange={() => {}} />);
    expect(screen.getByRole("button", { name: /limpiar/i })).toBeDefined();
  });

  it("clears the query when the clear button is pressed", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SearchBar value="pan" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button", { name: /limpiar/i }));

    expect(onValueChange).toHaveBeenCalledWith("");
  });
});
