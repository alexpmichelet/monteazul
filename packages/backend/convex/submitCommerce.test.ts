import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireCommerceOwner } from "./rbac";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all modules.
const modules = import.meta.glob("./**/*.*s");

/** A fully valid fiche submission (Comida y bebida, plages Horario). */
const validArgs = {
  name: "Panadería El Sol",
  category: "Comida y bebida",
  subcategories: ["Panadería y repostería"],
  description: "Pan artesanal horneado a diario en el barrio.",
  whatsapp: "3182173887",
  horario: { mode: "plages" as const, days: "Lun – Vie", from: 450, to: 960 },
  torreApto: "Torre 4 · Apto 926",
  instagram: "https://instagram.com/panaderiaelsol",
  contactName: "María",
  resides: "Resido en Monteazul",
  notas: "Pagos en efectivo y Nequi.",
};

/** Create a fresh account with the default `user` role and return its id. */
async function makeAccount(
  t: ReturnType<typeof convexTest>,
  email: string,
): Promise<Id<"users">> {
  return await t.run((ctx) =>
    ctx.db.insert("users", { email, role: "user" }),
  );
}

describe("submitCommerce — création de la fiche et attribution du rôle", () => {
  test("crée la fiche en `pendiente` et accorde le rôle `entreprise`", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "maria@example.com");

    const commerceId = await t
      .withIdentity({ subject: userId })
      .mutation(api.table.commerces.submitCommerce, validArgs);

    const commerce = await t.run((ctx) => ctx.db.get(commerceId));
    expect(commerce?.estado).toBe("pendiente");
    expect(commerce?.ownerId).toBe(userId);
    expect(commerce?.name).toBe("Panadería El Sol");

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("entreprise");
  });

  test("refuse un appelant anonyme (Visiteur)", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.table.commerces.submitCommerce, validArgs),
    ).rejects.toThrow();
  });

  test("persiste l'Horario en mode « plages »", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "plages@example.com");
    const commerceId = await t
      .withIdentity({ subject: userId })
      .mutation(api.table.commerces.submitCommerce, validArgs);
    const commerce = await t.run((ctx) => ctx.db.get(commerceId));
    expect(commerce?.horario).toEqual({
      mode: "plages",
      days: "Lun – Vie",
      from: 450,
      to: 960,
    });
  });

  test("persiste l'Horario en mode « Disponible »", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "cita@example.com");
    const commerceId = await t
      .withIdentity({ subject: userId })
      .mutation(api.table.commerces.submitCommerce, {
        ...validArgs,
        category: "Otro",
        subcategories: undefined,
        horario: { mode: "disponible", label: "con cita previa" },
      });
    const commerce = await t.run((ctx) => ctx.db.get(commerceId));
    expect(commerce?.horario).toEqual({
      mode: "disponible",
      label: "con cita previa",
    });
  });
});

describe("submitCommerce — validation des champs", () => {
  test("refuse un WhatsApp qui n'a pas exactement 10 chiffres", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "wa@example.com");
    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.table.commerces.submitCommerce, {
          ...validArgs,
          whatsapp: "+573182173887",
        }),
    ).rejects.toThrow(/whatsapp/i);
  });

  test("refuse des sous-catégories hors « Comida y bebida »", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "sub@example.com");
    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.table.commerces.submitCommerce, {
          ...validArgs,
          category: "Tecnología",
          subcategories: ["Otros"],
        }),
    ).rejects.toThrow(/comida y bebida/i);
  });

  test("refuse une valeur ¿Resides? hors des trois valeurs autorisées", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "res@example.com");
    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.table.commerces.submitCommerce, {
          ...validArgs,
          resides: "Tal vez",
        }),
    ).rejects.toThrow(/resides/i);
  });

  test("ne crée aucune fiche ni ne change le rôle quand la validation échoue", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "novalid@example.com");
    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.table.commerces.submitCommerce, {
          ...validArgs,
          whatsapp: "123",
        }),
    ).rejects.toThrow();

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("user");
    const all = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(all).toHaveLength(0);
  });
});

describe("submitCommerce — 1:1 strict", () => {
  test("refuse une deuxième soumission sur le même compte", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "twice@example.com");
    await t
      .withIdentity({ subject: userId })
      .mutation(api.table.commerces.submitCommerce, validArgs);

    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.table.commerces.submitCommerce, {
          ...validArgs,
          name: "Segundo negocio",
        }),
    ).rejects.toThrow();

    const all = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(all).toHaveLength(1);
  });
});

describe("submitCommerce — invisibilité publique", () => {
  test("une fiche `pendiente` soumise reste invisible sur l'annuaire public", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "hidden@example.com");
    await t
      .withIdentity({ subject: userId })
      .mutation(api.table.commerces.submitCommerce, validArgs);

    const sections = await t.query(
      api.table.commerces.listPublicByCategory,
      {},
    );
    const names = sections.flatMap((s) => s.commerces.map((c) => c.name));
    expect(names).not.toContain("Panadería El Sol");
    expect(sections).toEqual([]);
  });
});

describe("myCommerce — garde d'ownership en lecture", () => {
  test("retourne la fiche du propriétaire avec son estado", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeAccount(t, "owner@example.com");
    await t
      .withIdentity({ subject: userId })
      .mutation(api.table.commerces.submitCommerce, validArgs);

    const mine = await t
      .withIdentity({ subject: userId })
      .query(api.table.commerces.myCommerce, {});
    expect(mine?.name).toBe("Panadería El Sol");
    expect(mine?.estado).toBe("pendiente");
  });

  test("un autre compte ne voit jamais la fiche d'autrui (retourne null)", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeAccount(t, "owner2@example.com");
    const otherId = await makeAccount(t, "other@example.com");
    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.submitCommerce, validArgs);

    const theirs = await t
      .withIdentity({ subject: otherId })
      .query(api.table.commerces.myCommerce, {});
    expect(theirs).toBeNull();
  });

  test("un appelant anonyme ne voit aucune fiche (retourne null)", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeAccount(t, "owner3@example.com");
    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.submitCommerce, validArgs);

    const anon = await t.query(api.table.commerces.myCommerce, {});
    expect(anon).toBeNull();
  });
});

describe("requireCommerceOwner — garde d'ownership", () => {
  async function seedCommerce(t: ReturnType<typeof convexTest>) {
    const ownerId = await makeAccount(t, "guard-owner@example.com");
    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.submitCommerce, validArgs);
    const commerce = await t.run((ctx) =>
      ctx.db
        .query("commerces")
        .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
        .first(),
    );
    return { ownerId, commerceId: commerce!._id };
  }

  test("accepte le propriétaire de la fiche", async () => {
    const t = convexTest(schema, modules);
    const { ownerId, commerceId } = await seedCommerce(t);
    const result = await t
      .withIdentity({ subject: ownerId })
      .run((ctx) => requireCommerceOwner(ctx, commerceId));
    expect(result.userId).toBe(ownerId);
    expect(result.commerce._id).toBe(commerceId);
  });

  test("refuse un compte qui n'est pas le propriétaire", async () => {
    const t = convexTest(schema, modules);
    const { commerceId } = await seedCommerce(t);
    const otherId = await makeAccount(t, "guard-other@example.com");
    await expect(
      t
        .withIdentity({ subject: otherId })
        .run((ctx) => requireCommerceOwner(ctx, commerceId)),
    ).rejects.toThrow();
  });

  test("refuse un appelant anonyme", async () => {
    const t = convexTest(schema, modules);
    const { commerceId } = await seedCommerce(t);
    await expect(
      t.run((ctx) => requireCommerceOwner(ctx, commerceId)),
    ).rejects.toThrow();
  });
});
