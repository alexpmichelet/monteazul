import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";
import { CommerceTable } from "./commerce-table";

type AdminCommerce = FunctionReturnType<
  typeof api.table.adminCommerces.listCommerces
>[number];

function makeCommerce(
  id: string,
  overrides: Partial<AdminCommerce> = {},
): AdminCommerce {
  return {
    _id: id as unknown as Id<"commerces">,
    _creationTime: Number(id.replace(/\D/g, "") || 0),
    name: `Negocio ${id}`,
    category: "Mascotas",
    subcategories: undefined,
    description: "Descripción.",
    infoExtra: undefined,
    whatsapp: "3001234567",
    photos: [],
    coverFocusY: undefined,
    coverFocusX: undefined,
    coverZoom: undefined,
    horario: undefined,
    instagram: undefined,
    contactName: undefined,
    resides: "Resido en Monteazul",
    notas: undefined,
    estado: "publicado",
    sortOrder: undefined,
    ownerId: "user_1" as unknown as Id<"users">,
    ownerEmail: `owner-${id}@example.com`,
    ownerName: undefined,
    ...overrides,
  } as AdminCommerce;
}

const FORM_OPTIONS = {
  categories: ["Comida y bebida", "Mascotas"],
  comidaCategory: "Comida y bebida",
  comidaSubcategories: [],
  residesValues: [],
} as unknown as FunctionReturnType<typeof api.table.commerces.getFormOptions>;

function renderTable(commerces: AdminCommerce[]) {
  const reorders: { category: string; orderedIds: string[] }[] = [];
  const client = new ConvexReactClientFake();
  client.registerQueryFake(api.table.commerces.getFormOptions, () => FORM_OPTIONS);
  client.registerQueryFake(
    api.table.adminCommerces.listCommerces,
    () => commerces,
  );
  client.registerMutationFake(
    api.table.adminCommerces.reorderCategory,
    (args) => {
      reorders.push(args as { category: string; orderedIds: string[] });
      return null as never;
    },
  );
  const view = renderWithConvex(<CommerceTable />, { client });
  return { ...view, reorders };
}

describe("CommerceTable — buscador", () => {
  it("filters the rows by name, accent-insensitive", async () => {
    renderTable([
      makeCommerce("c1", { name: "Café París" }),
      makeCommerce("c2", { name: "Bazar" }),
    ]);

    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "cafe pari" },
    });

    await waitFor(() => {
      expect(screen.getByText("Café París")).toBeTruthy();
      expect(screen.queryByText("Bazar")).toBeNull();
    });
  });

  it("also matches the owner email, combined with the other filters", async () => {
    renderTable([
      makeCommerce("c1", { name: "Café París" }),
      makeCommerce("c2", { name: "Bazar" }),
    ]);

    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "owner-c2@" },
    });

    await waitFor(() => {
      expect(screen.getByText("Bazar")).toBeTruthy();
      expect(screen.queryByText("Café París")).toBeNull();
    });
  });
});

describe("CommerceTable — reordenar", () => {
  it("disables the Reordenar button without a category and shows the aviso", () => {
    renderTable([makeCommerce("c1")]);

    const button = screen.getByRole("button", { name: /Reordenar/ });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText("Selecciona una categoría para reordenar."),
    ).toBeTruthy();
  });

  it("with a category the rows follow the public order (sortOrder, then oldest)", async () => {
    renderTable([
      makeCommerce("c1", { name: "Sin posición", sortOrder: undefined }),
      makeCommerce("c2", { name: "Segundo", sortOrder: 1 }),
      makeCommerce("c3", { name: "Primero", sortOrder: 0 }),
    ]);

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "Mascotas" },
    });

    await waitFor(() => {
      const names = screen
        .getAllByRole("row")
        .slice(1) // header
        .map((row) => row.querySelectorAll("td")[1]?.textContent);
      expect(names).toEqual(["Primero", "Segundo", "Sin posición"]);
    });
  });

  it("committing an edited position persists the full category order (out of range → end)", async () => {
    const { reorders } = renderTable([
      makeCommerce("c1", { name: "Alfa", sortOrder: 0 }),
      makeCommerce("c2", { name: "Beta", sortOrder: 1 }),
      makeCommerce("c3", { name: "Gamma", sortOrder: 2 }),
    ]);

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "Mascotas" },
    });
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /Reordenar/ })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: /Reordenar/ }));

    // "50" with only 3 rows → clamped to the end (rule: fuera de rango → final).
    const alfa = await screen.findByLabelText("Posición de Alfa");
    fireEvent.change(alfa, { target: { value: "50" } });
    fireEvent.blur(alfa);

    await waitFor(() => {
      expect(reorders).toHaveLength(1);
      expect(reorders[0].category).toBe("Mascotas");
      expect(reorders[0].orderedIds).toEqual(["c2", "c3", "c1"]);
    });
  });
});
