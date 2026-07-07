import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all
// function modules.
const modules = import.meta.glob("./**/*.*s");

async function makeUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: "user" | "entreprise" | "admin" = "user",
): Promise<Id<"users">> {
  return await t.run((ctx) => ctx.db.insert("users", { email, role }));
}

async function insertCommerce(
  t: ReturnType<typeof convexTest>,
  ownerId: Id<"users">,
  seed: {
    name: string;
    category?: string;
    estado: "pendiente" | "publicado" | "suspendido";
  },
): Promise<Id<"commerces">> {
  const category = seed.category ?? "Tecnología";
  const description = "Descripción de prueba.";
  return await t.run((ctx) =>
    ctx.db.insert("commerces", {
      name: seed.name,
      category,
      description,
      searchText: commerceSearchText({ name: seed.name, category, description }),
      whatsapp: "3001234567",
      photos: [],
      horario: { mode: "semanal", windows: [{ dayOfWeek: 1, from: 540, to: 1080 }] },
      torreApto: "Torre 1 · Apto 101",
      resides: "Resido en Monteazul",
      notas: "Nota interna confidencial",
      estado: seed.estado,
      ownerId,
    }),
  );
}

/** Count the raw favorites rows for a (user, commerce) pair. */
async function countPair(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  commerceId: Id<"commerces">,
): Promise<number> {
  return await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("favorites")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("commerceId"), commerceId),
        ),
      )
      .collect();
    return rows.length;
  });
}

describe("favorites.toggle", () => {
  test("creates a Favori on first toggle and removes it on second (persistence)", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "user@example.com");
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await insertCommerce(t, owner, {
      name: "Sazón",
      estado: "publicado",
    });
    const asUser = t.withIdentity({ subject: userId });

    const first = await asUser.mutation(api.table.favorites.toggle, {
      commerceId,
    });
    expect(first.favorited).toBe(true);
    expect(await countPair(t, userId, commerceId)).toBe(1);

    const second = await asUser.mutation(api.table.favorites.toggle, {
      commerceId,
    });
    expect(second.favorited).toBe(false);
    expect(await countPair(t, userId, commerceId)).toBe(0);
  });

  test("never duplicates a (user, commerce) pair", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "user@example.com");
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await insertCommerce(t, owner, {
      name: "Uno",
      estado: "publicado",
    });
    const asUser = t.withIdentity({ subject: userId });

    // Toggle on, off, on again — the pair count is always 0 or 1, never 2.
    await asUser.mutation(api.table.favorites.toggle, { commerceId });
    await asUser.mutation(api.table.favorites.toggle, { commerceId });
    await asUser.mutation(api.table.favorites.toggle, { commerceId });
    expect(await countPair(t, userId, commerceId)).toBe(1);
  });

  test("the pair is unique per user: two Users can favorite the same Commerce", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "alice@example.com");
    const bob = await makeUser(t, "bob@example.com");
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await insertCommerce(t, owner, {
      name: "Compartido",
      estado: "publicado",
    });

    await t
      .withIdentity({ subject: alice })
      .mutation(api.table.favorites.toggle, { commerceId });
    await t
      .withIdentity({ subject: bob })
      .mutation(api.table.favorites.toggle, { commerceId });

    expect(await countPair(t, alice, commerceId)).toBe(1);
    expect(await countPair(t, bob, commerceId)).toBe(1);
  });

  test("refuses an anonymous caller (Visiteur) and creates no Favori", async () => {
    const t = convexTest(schema, modules);
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await insertCommerce(t, owner, {
      name: "Anon",
      estado: "publicado",
    });

    await expect(
      t.mutation(api.table.favorites.toggle, { commerceId }),
    ).rejects.toThrow();

    const all = await t.run((ctx) => ctx.db.query("favorites").collect());
    expect(all).toHaveLength(0);
  });
});

describe("favorites.listMineIds", () => {
  test("returns the ids favorited by the current User", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "user@example.com");
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const a = await insertCommerce(t, owner, { name: "A", estado: "publicado" });
    const b = await insertCommerce(t, owner, { name: "B", estado: "publicado" });
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.table.favorites.toggle, { commerceId: a });

    const ids = await asUser.query(api.table.favorites.listMineIds, {});
    expect(ids).toContain(a);
    expect(ids).not.toContain(b);
  });

  test("returns an empty list for an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.table.favorites.listMineIds, {})).toEqual([]);
  });
});

describe("favorites.listMine (« Mis guardados »)", () => {
  test("shows only publicado favorite fiches; a suspendido/pendiente favorite silently drops off", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "user@example.com");
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const pub = await insertCommerce(t, owner, {
      name: "Publicado",
      estado: "publicado",
    });
    const susp = await insertCommerce(t, owner, {
      name: "Suspendido",
      estado: "suspendido",
    });
    const pend = await insertCommerce(t, owner, {
      name: "Pendiente",
      estado: "pendiente",
    });
    const asUser = t.withIdentity({ subject: userId });

    // Favorite all three (a user could have favorited one while it was still
    // publicado, then it got suspended).
    await asUser.mutation(api.table.favorites.toggle, { commerceId: pub });
    await asUser.mutation(api.table.favorites.toggle, { commerceId: susp });
    await asUser.mutation(api.table.favorites.toggle, { commerceId: pend });

    const saved = await asUser.query(api.table.favorites.listMine, {});
    expect(saved.map((c) => c.name)).toEqual(["Publicado"]);
  });

  test("never leaks internal fields (resides, notas, ownerId, estado)", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "user@example.com");
    const owner = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await insertCommerce(t, owner, {
      name: "Con internos",
      estado: "publicado",
    });
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.table.favorites.toggle, { commerceId });

    const saved = (await asUser.query(api.table.favorites.listMine, {})) as Array<
      Record<string, unknown>
    >;
    expect(saved).toHaveLength(1);
    expect(saved[0].resides).toBeUndefined();
    expect(saved[0].notas).toBeUndefined();
    expect(saved[0].ownerId).toBeUndefined();
    expect(saved[0].estado).toBeUndefined();
  });

  test("returns an empty list for an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.table.favorites.listMine, {})).toEqual([]);
  });
});

describe("favorites role guard", () => {
  test("a User account cannot reach an entrepreneur/admin function (listUsers)", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "user@example.com");
    await expect(
      t
        .withIdentity({ subject: userId })
        .query(api.table.admin.listUsers, {
          paginationOpts: { numItems: 10, cursor: null },
        }),
    ).rejects.toThrow();
  });
});
