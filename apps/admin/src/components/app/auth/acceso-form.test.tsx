import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";
import { AccesoForm } from "./acceso-form";

const signIn = vi.fn();
const replace = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

function renderForm() {
  signIn.mockReset().mockResolvedValue({ signingIn: true });
  replace.mockReset();
  const client = new ConvexReactClientFake();
  client.registerQueryFake(api.table.users.currentUser, () => ({
    _id: "user_1" as unknown as Id<"users">,
    _creationTime: 0,
    email: "admin@example.com",
    role: "admin" as const,
  }));
  return renderWithConvex(<AccesoForm />, { client });
}

describe("AccesoForm — autofill de Chrome", () => {
  it("signs in with the values VISIBLE in the fields, not the stale form state", async () => {
    const user = userEvent.setup();
    renderForm();

    // The state mirrors what was typed…
    await user.type(screen.getByLabelText("Correo"), "vieja@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "clave-vieja");

    // …then Chrome's autofill swaps the DOM values WITHOUT firing the events
    // react-hook-form listens to (this is exactly what the popup does).
    const email = screen.getByLabelText("Correo") as HTMLInputElement;
    const password = screen.getByLabelText("Contraseña") as HTMLInputElement;
    email.value = "correcta@example.com";
    password.value = "clave-correcta";

    fireEvent.submit(document.getElementById("form-acceso") as HTMLFormElement);

    // ONE «Entrar» signs in with exactly what is on screen.
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn).toHaveBeenCalledWith("password", {
      email: "correcta@example.com",
      password: "clave-correcta",
      flow: "signIn",
    });
  });

  it("still validates: an autofill that leaves the email empty blocks the submit", async () => {
    renderForm();

    const password = screen.getByLabelText("Contraseña") as HTMLInputElement;
    password.value = "alguna-clave";

    fireEvent.submit(document.getElementById("form-acceso") as HTMLFormElement);

    await waitFor(() =>
      expect(screen.getByText("El correo es obligatorio.")).toBeTruthy(),
    );
    expect(signIn).not.toHaveBeenCalled();
  });
});
