import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WhatsAppButton } from "./whatsapp-button";

describe("WhatsAppButton", () => {
  it("defaults to the WhatsApp label", () => {
    render(<WhatsAppButton />);
    expect(screen.getByRole("button", { name: /WhatsApp/ })).toBeDefined();
  });

  it("renders a custom label", () => {
    render(<WhatsAppButton>Escribir por WhatsApp</WhatsAppButton>);
    expect(
      screen.getByRole("button", { name: "Escribir por WhatsApp" }),
    ).toBeDefined();
  });

  it("uses the whatsapp button variant", () => {
    render(<WhatsAppButton>Escribir por WhatsApp</WhatsAppButton>);
    expect(
      screen.getByRole("button").getAttribute("data-variant"),
    ).toBe("whatsapp");
  });

  it("fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<WhatsAppButton onClick={onClick} />);

    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<WhatsAppButton onClick={onClick} disabled />);

    await user.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });
});
