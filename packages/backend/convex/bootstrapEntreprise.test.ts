import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all modules.
const modules = import.meta.glob("./**/*.*s");

const FICHE = {
  password: "UnaClaveLarga#2026",
  estado: "publicado" as const,
  name: "Arepas de la Abuela",
  category: "Comida y bebida",
  subcategories: ["Almuerzos y comida típica"],
  description: "Arepas artesanales hechas en casa.",
  whatsapp: "3001234567",
  horario: { mode: "disponible" as const, label: "Bajo pedido" },
  contactName: "Abuela Prueba",
  resides: "Resido en Monteazul",
};

describe("bootstrapEntreprise — import manuel Notion", () => {
  test("crée le compte entreprise (hash du mot de passe fourni) + la fiche avec l'estado demandé", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(
      internal.bootstrapEntreprise.bootstrapEntreprise,
      { email: "Arepas@Example.com ", ...FICHE },
    );
    expect(result).toEqual({
      email: "arepas@example.com",
      name: "Arepas de la Abuela",
      estado: "publicado",
    });

    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", "arepas@example.com"))
        .first(),
    );
    expect(user?.role).toBe("entreprise");
    expect(user?.emailVerificationTime).toBeTypeOf("number");

    // Password credential stored hashed, never in plaintext.
    const account = await t.run(async (ctx) =>
      (await ctx.db.query("authAccounts").collect()).find(
        (a) => a.providerAccountId === "arepas@example.com",
      ),
    );
    expect(account?.provider).toBe("password");
    expect(account?.secret).toBeTypeOf("string");
    expect(account?.secret).not.toContain(FICHE.password);

    const commerce = await t.run(async (ctx) =>
      (await ctx.db.query("commerces").collect())[0],
    );
    expect(commerce?.estado).toBe("publicado");
    expect(commerce?.ownerId).toBe(user?._id);
    expect(commerce?.photos).toEqual([]);
    expect(commerce?.searchText).toContain("arepas");
  });

  test("refuse un correo déjà utilisé (aucune écriture partielle)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.bootstrapEntreprise.bootstrapEntreprise, {
      email: "dupe@example.com",
      ...FICHE,
    });

    await expect(
      t.mutation(internal.bootstrapEntreprise.bootstrapEntreprise, {
        email: "dupe@example.com",
        ...FICHE,
        name: "Otro negocio",
      }),
    ).rejects.toThrow(/ya existe/i);

    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(commerces).toHaveLength(1);
  });

  test("applique les règles fiche partagées (subcategorías hors Comida rejetées) et refuse un mot de passe court", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(internal.bootstrapEntreprise.bootstrapEntreprise, {
        email: "mascotas@example.com",
        ...FICHE,
        category: "Mascotas",
        subcategories: ["Otros"],
      }),
    ).rejects.toThrow(/subcategorías/i);

    await expect(
      t.mutation(internal.bootstrapEntreprise.bootstrapEntreprise, {
        email: "corta@example.com",
        ...FICHE,
        password: "corta",
      }),
    ).rejects.toThrow(/12 caracteres/i);

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(0);
  });
});
