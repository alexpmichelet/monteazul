import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the default Spanish label for each estado", () => {
    const { rerender } = render(<StatusBadge status="abierto" />);
    expect(screen.getByText("Abierto")).toBeDefined();

    rerender(<StatusBadge status="cerrado" />);
    expect(screen.getByText("Cerrado")).toBeDefined();

    rerender(<StatusBadge status="disponible" />);
    expect(screen.getByText("Disponible")).toBeDefined();
  });

  it("exposes the status and its visual tone as data attributes", () => {
    const { rerender } = render(<StatusBadge status="abierto" />);
    let badge = screen.getByTestId("status-badge");
    expect(badge.getAttribute("data-status")).toBe("abierto");
    // Abierto shows the green (open) treatment.
    expect(badge.getAttribute("data-tone")).toBe("open");

    rerender(<StatusBadge status="disponible" />);
    badge = screen.getByTestId("status-badge");
    // Disponible reuses the green (open) treatment, per the prototype.
    expect(badge.getAttribute("data-tone")).toBe("open");

    rerender(<StatusBadge status="cerrado" />);
    badge = screen.getByTestId("status-badge");
    expect(badge.getAttribute("data-tone")).toBe("closed");
  });

  it("lets the caller override the label text", () => {
    render(<StatusBadge status="abierto" label="Abierto ahora" />);
    expect(screen.getByText("Abierto ahora")).toBeDefined();
  });

  it("renders a pill variant for the card overlay", () => {
    render(<StatusBadge status="abierto" pill />);
    const badge = screen.getByTestId("status-badge");
    expect(badge.getAttribute("data-pill")).toBe("true");
  });
});
