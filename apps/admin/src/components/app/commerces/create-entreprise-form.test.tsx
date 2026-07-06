import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";

import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";
import { CreateEntrepriseForm } from "./create-entreprise-form";

type CreateArgs =
  (typeof api.table.seededEntreprise.createSeededEntreprise)["_args"];
type CreateReturn = FunctionReturnType<
  typeof api.table.seededEntreprise.createSeededEntreprise
>;
type FormOptions = FunctionReturnType<
  typeof api.table.commerces.getFormOptions
>;

// Toasts are fire-and-forget side effects; stub them so no Toaster is needed.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// jsdom lacks ResizeObserver, which the Radix RadioGroup (Horario editor) uses.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const FORM_OPTIONS = {
  categories: ["Comida y bebida", "Tecnología", "Otro"],
  comidaCategory: "Comida y bebida",
  comidaSubcategories: ["Panadería y repostería"],
  residesValues: [
    "Resido en Monteazul",
    "Resido cerca de la zona",
    "No resido cerca de la zona",
  ],
} as unknown as FormOptions;

function setupClient(createFake: (args: CreateArgs) => CreateReturn) {
  const client = new ConvexReactClientFake();
  client.registerQueryFake(
    api.table.commerces.getFormOptions,
    () => FORM_OPTIONS,
  );
  client.registerMutationFake(
    api.table.seededEntreprise.createSeededEntreprise,
    createFake,
  );
  return client;
}

function fillValidFiche() {
  fireEvent.change(screen.getByLabelText(/correo/i), {
    target: { value: "nuevo@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/nombre del negocio/i), {
    target: { value: "TecnoFix MZ" },
  });
  fireEvent.change(screen.getByLabelText(/^categoría$/i), {
    target: { value: "Tecnología" },
  });
  fireEvent.change(screen.getByLabelText(/descripción/i), {
    target: { value: "Reparación de celulares y computadores." },
  });
  fireEvent.change(screen.getByLabelText(/whatsapp/i), {
    target: { value: "3182173887" },
  });
  fireEvent.change(screen.getByLabelText(/resides en monteazul/i), {
    target: { value: "Resido en Monteazul" },
  });
}

describe("CreateEntrepriseForm", () => {
  it("llama createSeededEntreprise con el correo y la ficha, y revela la contraseña una vez", async () => {
    const createFake = vi.fn(
      (_args: CreateArgs): CreateReturn => ({
        email: "nuevo@example.com",
        password: "Str0ng!Passw0rd#42xy",
      }),
    );
    const client = setupClient(createFake);

    renderWithConvex(<CreateEntrepriseForm />, { client });

    fillValidFiche();
    fireEvent.click(
      screen.getByRole("button", { name: /crear cuenta/i }),
    );

    await waitFor(() => expect(createFake).toHaveBeenCalledTimes(1));
    const args = createFake.mock.calls[0][0];
    expect(args.email).toBe("nuevo@example.com");
    expect(args.name).toBe("TecnoFix MZ");
    expect(args.category).toBe("Tecnología");
    expect(args.whatsapp).toBe("3182173887");

    // La contraseña generada se muestra una vez al admin.
    await waitFor(() =>
      expect(screen.getByText("Str0ng!Passw0rd#42xy")).toBeTruthy(),
    );
  });

  it("muestra el error del backend cuando el correo ya existe", async () => {
    const { ConvexError } = await import("convex/values");
    const createFake = vi.fn((_args: CreateArgs): CreateReturn => {
      throw new ConvexError({
        message: "Ya existe una cuenta con este correo.",
      });
    });
    const client = setupClient(createFake);

    renderWithConvex(<CreateEntrepriseForm />, { client });

    fillValidFiche();
    fireEvent.click(
      screen.getByRole("button", { name: /crear cuenta/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/ya existe una cuenta con este correo/i),
      ).toBeTruthy(),
    );
  });
});
