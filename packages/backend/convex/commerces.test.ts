import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function makeOwner(
  t: ReturnType<typeof convexTest>,
  email: string,
): Promise<Id<"users">> {
  return await t.run((ctx) =>
    ctx.db.insert("users", { email, role: "entreprise" }),
  );
}

type CommerceSeed = {
  name: string;
  category: string;
  estado: "pendiente" | "publicado" | "suspendido";
  subcategories?: string[];
};

async function insertCommerce(
  t: ReturnType<typeof convexTest>,
  ownerId: Id<"users">,
  seed: CommerceSeed,
) {
  return await t.run((ctx) =>
    ctx.db.insert("commerces", {
      name: seed.name,
      category: seed.category,
      subcategories: seed.subcategories,
      description: "Descripción de prueba.",
      whatsapp: "3001234567",
      photos: [],
      horario: { mode: "plages", days: "Lun – Vie", from: 540, to: 1080 },
      torreApto: "Torre 1 · Apto 101",
      resides: "Resido en Monteazul",
      notas: "Nota interna confidencial",
      estado: seed.estado,
      ownerId,
    }),
  );
}

describe("listPublicByCategory", () => {
  test("returns only publicado fiches, never pendiente nor suspendido", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeOwner(t, "owner@example.com");
    await insertCommerce(t, owner, {
      name: "Publicado uno",
      category: "Tecnología",
      estado: "publicado",
    });
    await insertCommerce(t, owner, {
      name: "Pendiente uno",
      category: "Tecnología",
      estado: "pendiente",
    });
    await insertCommerce(t, owner, {
      name: "Suspendido uno",
      category: "Tecnología",
      estado: "suspendido",
    });

    const sections = await t.query(api.table.commerces.listPublicByCategory, {});
    const names = sections.flatMap((s) => s.commerces.map((c) => c.name));
    expect(names).toEqual(["Publicado uno"]);
  });

  test("groups publicado fiches by category in the canonical order with counts", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeOwner(t, "owner@example.com");
    await insertCommerce(t, owner, {
      name: "Tecno A",
      category: "Tecnología",
      estado: "publicado",
    });
    await insertCommerce(t, owner, {
      name: "Comida A",
      category: "Comida y bebida",
      subcategories: ["Panadería y repostería"],
      estado: "publicado",
    });
    await insertCommerce(t, owner, {
      name: "Comida B",
      category: "Comida y bebida",
      subcategories: ["Frutas y mercado"],
      estado: "publicado",
    });

    const sections = await t.query(api.table.commerces.listPublicByCategory, {});
    // Comida y bebida comes before Tecnología in the canonical order.
    expect(sections.map((s) => s.category)).toEqual([
      "Comida y bebida",
      "Tecnología",
    ]);
    expect(sections[0].count).toBe(2);
    expect(sections[1].count).toBe(1);
  });

  test("never exposes internal fields (resides, notas, ownerId, estado)", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeOwner(t, "owner@example.com");
    await insertCommerce(t, owner, {
      name: "Con datos internos",
      category: "Mascotas",
      estado: "publicado",
    });

    const sections = await t.query(api.table.commerces.listPublicByCategory, {});
    const commerce = sections[0].commerces[0] as Record<string, unknown>;
    expect(commerce.name).toBe("Con datos internos");
    expect(commerce.resides).toBeUndefined();
    expect(commerce.notas).toBeUndefined();
    expect(commerce.ownerId).toBeUndefined();
    expect(commerce.estado).toBeUndefined();
  });

  test("returns an empty list when there is no publicado fiche", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeOwner(t, "owner@example.com");
    await insertCommerce(t, owner, {
      name: "Solo pendiente",
      category: "Otro",
      estado: "pendiente",
    });
    const sections = await t.query(api.table.commerces.listPublicByCategory, {});
    expect(sections).toEqual([]);
  });
});

describe("commerces schema", () => {
  test("accepts every canonical category value", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeOwner(t, "owner@example.com");
    const categories = [
      "Comida y bebida",
      "Mascotas",
      "Belleza y cuidado personal",
      "Salud y bienestar",
      "Accesorios y ropa",
      "Hogar y artesanías",
      "Tecnología",
      "Inmuebles y servicios",
      "Otro",
    ];
    for (const category of categories) {
      await expect(
        insertCommerce(t, owner, {
          name: `Fiche ${category}`,
          category,
          estado: "publicado",
        }),
      ).resolves.toBeDefined();
    }
  });
});
