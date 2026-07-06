import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type Role = "user" | "entreprise" | "admin";

async function makeUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: Role,
): Promise<Id<"users">> {
  return await t.run((ctx) => ctx.db.insert("users", { email, role }));
}

type CommerceSeed = {
  name: string;
  category: string;
  estado: "pendiente" | "publicado" | "suspendido";
  subcategories?: string[];
  description?: string;
};

async function insertCommerce(
  t: ReturnType<typeof convexTest>,
  ownerId: Id<"users">,
  seed: CommerceSeed,
): Promise<Id<"commerces">> {
  const description = seed.description ?? "Descripción de prueba.";
  return await t.run((ctx) =>
    ctx.db.insert("commerces", {
      name: seed.name,
      category: seed.category,
      subcategories: seed.subcategories,
      description,
      searchText: commerceSearchText({
        name: seed.name,
        category: seed.category,
        subcategories: seed.subcategories,
        description,
      }),
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

/** Standard, valid `updateMyCommerce` args (Tecnología, no sub-categories). */
function editArgs(
  commerceId: Id<"commerces">,
  over: Record<string, unknown> = {},
) {
  return {
    commerceId,
    name: "Nombre editado",
    category: "Tecnología",
    description: "Descripción editada por el dueño.",
    whatsapp: "3001234567",
    horario: { mode: "plages" as const, days: "Lun – Vie", from: 540, to: 1080 },
    resides: "Resido en Monteazul",
    ...over,
  };
}

async function estadoOf(
  t: ReturnType<typeof convexTest>,
  id: Id<"commerces">,
): Promise<string | undefined> {
  const doc = await t.run((ctx) => ctx.db.get(id));
  return doc?.estado;
}

// -----------------------------------------------------------------------------
// updateMyCommerce — the owner edits every field, same validations as submission,
// and editing NEVER re-opens approval (moderación a posteriori).
// -----------------------------------------------------------------------------

describe("updateMyCommerce", () => {
  test("the owner edits their fiche fields and the changes persist", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "Nombre viejo",
      category: "Tecnología",
      estado: "publicado",
    });

    await t.withIdentity({ subject: owner }).mutation(
      api.table.commerces.updateMyCommerce,
      editArgs(id, {
        name: "Reparaciones del Dueño",
        whatsapp: "3011112222",
      }),
    );

    const mine = await t
      .withIdentity({ subject: owner })
      .query(api.table.commerces.myCommerce, {});
    expect(mine?.name).toBe("Reparaciones del Dueño");
    expect(mine?.whatsapp).toBe("3011112222");
  });

  test("editing a publicado fiche keeps it publicado and visible publicly at once", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "Nombre viejo",
      category: "Tecnología",
      estado: "publicado",
    });

    await t.withIdentity({ subject: owner }).mutation(
      api.table.commerces.updateMyCommerce,
      editArgs(id, { name: "Nombre Nuevo Publico" }),
    );

    // Estado unchanged — no return to approval.
    expect(await estadoOf(t, id)).toBe("publicado");

    // The edit is visible publicly immediately (search haystack recomputed).
    const sections = await t.query(api.table.commerces.searchPublic, {
      text: "nombre nuevo publico",
    });
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([
      "Nombre Nuevo Publico",
    ]);
  });

  test("editing never changes the estado, from any estado", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    for (const estado of ["pendiente", "publicado", "suspendido"] as const) {
      const id = await insertCommerce(t, owner, {
        name: `E-${estado}`,
        category: "Tecnología",
        estado,
      });
      await t
        .withIdentity({ subject: owner })
        .mutation(
          api.table.commerces.updateMyCommerce,
          editArgs(id, { name: `E-${estado}-editada` }),
        );
      expect(await estadoOf(t, id)).toBe(estado);
    }
  });

  test("a non-owner (other entrepreneur, plain user, anonymous) cannot edit", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const intruder = await makeUser(t, "intruder@example.com", "entreprise");
    const client = await makeUser(t, "client@example.com", "user");
    const id = await insertCommerce(t, owner, {
      name: "Fiche del dueño",
      category: "Tecnología",
      estado: "publicado",
    });

    await expect(
      t
        .withIdentity({ subject: intruder })
        .mutation(api.table.commerces.updateMyCommerce, editArgs(id)),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: client })
        .mutation(api.table.commerces.updateMyCommerce, editArgs(id)),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.table.commerces.updateMyCommerce, editArgs(id)),
    ).rejects.toThrow();

    // The fiche is untouched.
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc?.name).toBe("Fiche del dueño");
  });

  test("rejects an invalid WhatsApp number (same rule as submission)", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "N",
      category: "Tecnología",
      estado: "publicado",
    });
    await expect(
      t
        .withIdentity({ subject: owner })
        .mutation(
          api.table.commerces.updateMyCommerce,
          editArgs(id, { whatsapp: "123" }),
        ),
    ).rejects.toThrow();
  });

  test("rejects sub-categories on a non-Comida category (same rule as submission)", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "N",
      category: "Tecnología",
      estado: "publicado",
    });
    await expect(
      t
        .withIdentity({ subject: owner })
        .mutation(
          api.table.commerces.updateMyCommerce,
          editArgs(id, { subcategories: ["Panadería y repostería"] }),
        ),
    ).rejects.toThrow();
  });
});

// -----------------------------------------------------------------------------
// suspendMyCommerce / reactivateMyCommerce — the owner drives the two reversible
// transitions through the shared `approval` state machine, without any admin.
// -----------------------------------------------------------------------------

describe("suspendMyCommerce / reactivateMyCommerce", () => {
  test("the owner suspends a publicado fiche → suspendido, invisible publicly", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "Se va a suspender",
      category: "Tecnología",
      estado: "publicado",
    });

    let sections = await t.query(api.table.commerces.listPublicByCategory, {});
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([
      "Se va a suspender",
    ]);

    await t
      .withIdentity({ subject: owner })
      .mutation(api.table.commerces.suspendMyCommerce, { commerceId: id });

    expect(await estadoOf(t, id)).toBe("suspendido");
    sections = await t.query(api.table.commerces.listPublicByCategory, {});
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([]);
  });

  test("the owner reactivates a suspendido fiche → publicado, without admin approval", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "Vuelve al aire",
      category: "Tecnología",
      estado: "suspendido",
    });

    await t
      .withIdentity({ subject: owner })
      .mutation(api.table.commerces.reactivateMyCommerce, { commerceId: id });

    expect(await estadoOf(t, id)).toBe("publicado");
    const sections = await t.query(
      api.table.commerces.listPublicByCategory,
      {},
    );
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([
      "Vuelve al aire",
    ]);
  });

  test("suspend is rejected from pendiente and suspendido (approval module)", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    for (const estado of ["pendiente", "suspendido"] as const) {
      const id = await insertCommerce(t, owner, {
        name: estado,
        category: "Tecnología",
        estado,
      });
      await expect(
        t
          .withIdentity({ subject: owner })
          .mutation(api.table.commerces.suspendMyCommerce, { commerceId: id }),
      ).rejects.toThrow();
      expect(await estadoOf(t, id)).toBe(estado);
    }
  });

  test("reactivate is rejected from pendiente and publicado (approval module)", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    for (const estado of ["pendiente", "publicado"] as const) {
      const id = await insertCommerce(t, owner, {
        name: estado,
        category: "Tecnología",
        estado,
      });
      await expect(
        t
          .withIdentity({ subject: owner })
          .mutation(api.table.commerces.reactivateMyCommerce, {
            commerceId: id,
          }),
      ).rejects.toThrow();
      expect(await estadoOf(t, id)).toBe(estado);
    }
  });

  test("a non-owner (other entrepreneur, anonymous) cannot suspend nor reactivate", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const intruder = await makeUser(t, "intruder@example.com", "entreprise");
    const publicado = await insertCommerce(t, owner, {
      name: "Publicada",
      category: "Tecnología",
      estado: "publicado",
    });
    const suspendido = await insertCommerce(t, owner, {
      name: "Suspendida",
      category: "Mascotas",
      estado: "suspendido",
    });

    await expect(
      t
        .withIdentity({ subject: intruder })
        .mutation(api.table.commerces.suspendMyCommerce, {
          commerceId: publicado,
        }),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: intruder })
        .mutation(api.table.commerces.reactivateMyCommerce, {
          commerceId: suspendido,
        }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.table.commerces.suspendMyCommerce, {
        commerceId: publicado,
      }),
    ).rejects.toThrow();

    // Neither fiche moved.
    expect(await estadoOf(t, publicado)).toBe("publicado");
    expect(await estadoOf(t, suspendido)).toBe("suspendido");
  });
});
