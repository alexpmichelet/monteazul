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
      horario: { mode: "semanal", windows: [{ dayOfWeek: 1, from: 540, to: 1080 }] },
      torreApto: "Torre 1 · Apto 101",
      resides: "Resido en Monteazul",
      notas: "Nota interna confidencial",
      estado: seed.estado,
      ownerId,
    }),
  );
}

// -----------------------------------------------------------------------------
// Guards — every admin surface refuses anonymous / user / entreprise callers.
// -----------------------------------------------------------------------------

describe("admin guards", () => {
  test("approvalQueue refuses anonymous, user and entreprise, accepts admin", async () => {
    const t = convexTest(schema, modules);
    const user = await makeUser(t, "u@example.com", "user");
    const entre = await makeUser(t, "e@example.com", "entreprise");
    const admin = await makeUser(t, "a@example.com", "admin");

    await expect(
      t.query(api.table.adminCommerces.approvalQueue, {}),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: user })
        .query(api.table.adminCommerces.approvalQueue, {}),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: entre })
        .query(api.table.adminCommerces.approvalQueue, {}),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: admin })
        .query(api.table.adminCommerces.approvalQueue, {}),
    ).resolves.toEqual([]);
  });

  test("listCommerces and getCommerceForAdmin refuse non-admin", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const entre = await makeUser(t, "e@example.com", "entreprise");
    const id = await insertCommerce(t, entre, {
      name: "N",
      category: "Tecnología",
      estado: "pendiente",
    });

    await expect(
      t
        .withIdentity({ subject: entre })
        .query(api.table.adminCommerces.listCommerces, {}),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: entre })
        .query(api.table.adminCommerces.getCommerceForAdmin, { commerceId: id }),
    ).rejects.toThrow();
    // Admin can read.
    await expect(
      t
        .withIdentity({ subject: admin })
        .query(api.table.adminCommerces.getCommerceForAdmin, { commerceId: id }),
    ).resolves.not.toBeNull();
  });

  test("every estado mutation refuses a non-admin caller", async () => {
    const t = convexTest(schema, modules);
    const entre = await makeUser(t, "e@example.com", "entreprise");
    const id = await insertCommerce(t, entre, {
      name: "N",
      category: "Tecnología",
      estado: "pendiente",
    });
    const asEntre = t.withIdentity({ subject: entre });

    await expect(
      asEntre.mutation(api.table.adminCommerces.approveCommerce, { commerceId: id }),
    ).rejects.toThrow();
    await expect(
      asEntre.mutation(api.table.adminCommerces.suspendCommerce, { commerceId: id }),
    ).rejects.toThrow();
    await expect(
      asEntre.mutation(api.table.adminCommerces.reactivateCommerce, {
        commerceId: id,
      }),
    ).rejects.toThrow();
    await expect(
      asEntre.mutation(api.table.adminCommerces.removeCommerce, { commerceId: id }),
    ).rejects.toThrow();
    await expect(
      asEntre.mutation(api.table.adminCommerces.updateCommerce, {
        commerceId: id,
        name: "Hack",
        category: "Tecnología",
        description: "x",
        whatsapp: "3001234567",
        horario: { mode: "semanal", windows: [{ dayOfWeek: 1, from: 540, to: 1080 }] },
        resides: "Resido en Monteazul",
      }),
    ).rejects.toThrow();
  });
});

// -----------------------------------------------------------------------------
// Approval queue — pendiente only, oldest first, with internal fields.
// -----------------------------------------------------------------------------

describe("approvalQueue", () => {
  test("lists only pendiente fiches, oldest first", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");

    await insertCommerce(t, owner, {
      name: "Primera",
      category: "Tecnología",
      estado: "pendiente",
    });
    await insertCommerce(t, owner, {
      name: "Segunda",
      category: "Mascotas",
      estado: "pendiente",
    });
    await insertCommerce(t, owner, {
      name: "Publicada",
      category: "Tecnología",
      estado: "publicado",
    });
    await insertCommerce(t, owner, {
      name: "Suspendida",
      category: "Tecnología",
      estado: "suspendido",
    });

    const queue = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.approvalQueue, {});
    expect(queue.map((c) => c.name)).toEqual(["Primera", "Segunda"]);
  });

  test("exposes the internal fields resides and notas to the admin", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    await insertCommerce(t, owner, {
      name: "Con datos internos",
      category: "Mascotas",
      estado: "pendiente",
    });

    const queue = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.approvalQueue, {});
    expect(queue[0].resides).toBe("Resido en Monteazul");
    expect(queue[0].notas).toBe("Nota interna confidencial");
    expect(queue[0].estado).toBe("pendiente");
  });
});

// -----------------------------------------------------------------------------
// listCommerces — filter by estado and/or category.
// -----------------------------------------------------------------------------

describe("listCommerces", () => {
  test("returns every fiche when no filter is given", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    await insertCommerce(t, owner, {
      name: "A",
      category: "Tecnología",
      estado: "pendiente",
    });
    await insertCommerce(t, owner, {
      name: "B",
      category: "Mascotas",
      estado: "publicado",
    });

    const all = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.listCommerces, {});
    expect(all.map((c) => c.name).sort()).toEqual(["A", "B"]);
  });

  test("filters by estado", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    await insertCommerce(t, owner, {
      name: "Pend",
      category: "Tecnología",
      estado: "pendiente",
    });
    await insertCommerce(t, owner, {
      name: "Pub",
      category: "Tecnología",
      estado: "publicado",
    });

    const pub = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.listCommerces, { estado: "publicado" });
    expect(pub.map((c) => c.name)).toEqual(["Pub"]);
  });

  test("filters by category", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    await insertCommerce(t, owner, {
      name: "Tec",
      category: "Tecnología",
      estado: "publicado",
    });
    await insertCommerce(t, owner, {
      name: "Mas",
      category: "Mascotas",
      estado: "publicado",
    });

    const mascotas = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.listCommerces, { category: "Mascotas" });
    expect(mascotas.map((c) => c.name)).toEqual(["Mas"]);
  });

  test("filters by estado AND category combined", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    await insertCommerce(t, owner, {
      name: "TecPub",
      category: "Tecnología",
      estado: "publicado",
    });
    await insertCommerce(t, owner, {
      name: "TecPend",
      category: "Tecnología",
      estado: "pendiente",
    });
    await insertCommerce(t, owner, {
      name: "MasPub",
      category: "Mascotas",
      estado: "publicado",
    });

    const result = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.listCommerces, {
        estado: "publicado",
        category: "Tecnología",
      });
    expect(result.map((c) => c.name)).toEqual(["TecPub"]);
  });
});

// -----------------------------------------------------------------------------
// Estado transitions through the admin mutations — valid AND invalid.
// -----------------------------------------------------------------------------

async function estadoOf(
  t: ReturnType<typeof convexTest>,
  admin: Id<"users">,
  id: Id<"commerces">,
): Promise<string | undefined> {
  const doc = await t
    .withIdentity({ subject: admin })
    .query(api.table.adminCommerces.getCommerceForAdmin, { commerceId: id });
  return doc?.estado;
}

describe("estado transitions", () => {
  test("approve: pendiente → publicado", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "N",
      category: "Tecnología",
      estado: "pendiente",
    });
    await t
      .withIdentity({ subject: admin })
      .mutation(api.table.adminCommerces.approveCommerce, { commerceId: id });
    expect(await estadoOf(t, admin, id)).toBe("publicado");
  });

  test("approve is rejected from publicado and suspendido", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    for (const estado of ["publicado", "suspendido"] as const) {
      const id = await insertCommerce(t, owner, {
        name: estado,
        category: "Tecnología",
        estado,
      });
      await expect(
        t
          .withIdentity({ subject: admin })
          .mutation(api.table.adminCommerces.approveCommerce, { commerceId: id }),
      ).rejects.toThrow();
    }
  });

  test("suspend: publicado → suspendido", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "N",
      category: "Tecnología",
      estado: "publicado",
    });
    await t
      .withIdentity({ subject: admin })
      .mutation(api.table.adminCommerces.suspendCommerce, { commerceId: id });
    expect(await estadoOf(t, admin, id)).toBe("suspendido");
  });

  test("suspend is rejected from pendiente and suspendido", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    for (const estado of ["pendiente", "suspendido"] as const) {
      const id = await insertCommerce(t, owner, {
        name: estado,
        category: "Tecnología",
        estado,
      });
      await expect(
        t
          .withIdentity({ subject: admin })
          .mutation(api.table.adminCommerces.suspendCommerce, { commerceId: id }),
      ).rejects.toThrow();
    }
  });

  test("reactivate: suspendido → publicado", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "N",
      category: "Tecnología",
      estado: "suspendido",
    });
    await t
      .withIdentity({ subject: admin })
      .mutation(api.table.adminCommerces.reactivateCommerce, { commerceId: id });
    expect(await estadoOf(t, admin, id)).toBe("publicado");
  });

  test("reactivate is rejected from pendiente and publicado", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    for (const estado of ["pendiente", "publicado"] as const) {
      const id = await insertCommerce(t, owner, {
        name: estado,
        category: "Tecnología",
        estado,
      });
      await expect(
        t
          .withIdentity({ subject: admin })
          .mutation(api.table.adminCommerces.reactivateCommerce, {
            commerceId: id,
          }),
      ).rejects.toThrow();
    }
  });
});

// -----------------------------------------------------------------------------
// Acceptance — approval publishes to the public annuaire, suspension hides it.
// -----------------------------------------------------------------------------

describe("public visibility follows the estado", () => {
  test("approving a fiche makes it appear on the public annuaire", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "Recién aprobada",
      category: "Tecnología",
      estado: "pendiente",
    });

    let sections = await t.query(api.table.commerces.listPublicByCategory, {});
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([]);

    await t
      .withIdentity({ subject: admin })
      .mutation(api.table.adminCommerces.approveCommerce, { commerceId: id });

    sections = await t.query(api.table.commerces.listPublicByCategory, {});
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([
      "Recién aprobada",
    ]);
  });

  test("suspending a fiche removes it from the public annuaire", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
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
      .withIdentity({ subject: admin })
      .mutation(api.table.adminCommerces.suspendCommerce, { commerceId: id });

    sections = await t.query(api.table.commerces.listPublicByCategory, {});
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// updateCommerce — same validations as the entrepreneur form, never the estado.
// -----------------------------------------------------------------------------

describe("updateCommerce", () => {
  test("edits the fiche fields and recomputes the search haystack", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "Nombre viejo",
      category: "Tecnología",
      estado: "publicado",
    });

    await t.withIdentity({ subject: admin }).mutation(
      api.table.adminCommerces.updateCommerce,
      {
        commerceId: id,
        name: "Reparaciones Nuevas",
        category: "Tecnología",
        description: "Servicio actualizado por el administrador.",
        whatsapp: "3011112222",
        horario: { mode: "semanal", windows: [{ dayOfWeek: 1, from: 540, to: 1080 }] },
        resides: "Resido en Monteazul",
      },
    );

    const doc = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.getCommerceForAdmin, { commerceId: id });
    expect(doc?.name).toBe("Reparaciones Nuevas");
    expect(doc?.whatsapp).toBe("3011112222");

    // Search haystack recomputed → the new name is findable publicly.
    const sections = await t.query(api.table.commerces.searchPublic, {
      text: "reparaciones nuevas",
    });
    expect(sections.flatMap((s) => s.commerces.map((c) => c.name))).toEqual([
      "Reparaciones Nuevas",
    ]);
  });

  test("never changes the estado (a-posteriori moderation)", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    for (const estado of ["pendiente", "publicado", "suspendido"] as const) {
      const id = await insertCommerce(t, owner, {
        name: `E-${estado}`,
        category: "Tecnología",
        estado,
      });
      await t.withIdentity({ subject: admin }).mutation(
        api.table.adminCommerces.updateCommerce,
        {
          commerceId: id,
          name: `E-${estado}-editada`,
          category: "Tecnología",
          description: "Editada.",
          whatsapp: "3001234567",
          horario: { mode: "semanal", windows: [{ dayOfWeek: 1, from: 540, to: 1080 }] },
          resides: "Resido en Monteazul",
        },
      );
      expect(await estadoOf(t, admin, id)).toBe(estado);
    }
  });

  test("rejects an invalid WhatsApp number (same rule as the form)", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "N",
      category: "Tecnología",
      estado: "publicado",
    });
    await expect(
      t.withIdentity({ subject: admin }).mutation(
        api.table.adminCommerces.updateCommerce,
        {
          commerceId: id,
          name: "N",
          category: "Tecnología",
          description: "x",
          whatsapp: "123",
          horario: { mode: "semanal", windows: [{ dayOfWeek: 1, from: 540, to: 1080 }] },
          resides: "Resido en Monteazul",
        },
      ),
    ).rejects.toThrow();
  });

  test("rejects sub-categories on a non-Comida category", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "N",
      category: "Tecnología",
      estado: "publicado",
    });
    await expect(
      t.withIdentity({ subject: admin }).mutation(
        api.table.adminCommerces.updateCommerce,
        {
          commerceId: id,
          name: "N",
          category: "Tecnología",
          subcategories: ["Panadería y repostería"],
          description: "x",
          whatsapp: "3001234567",
          horario: { mode: "semanal", windows: [{ dayOfWeek: 1, from: 540, to: 1080 }] },
          resides: "Resido en Monteazul",
        },
      ),
    ).rejects.toThrow();
  });
});

// -----------------------------------------------------------------------------
// removeCommerce — definitive removal from any estado.
// -----------------------------------------------------------------------------

describe("removeCommerce", () => {
  test("libera el correo: elimina ficha, journal, favoritos y la cuenta entreprise con sus credenciales", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await t.run((ctx) =>
      ctx.db.insert("users", { email: "negocio@example.com", role: "entreprise" }),
    );
    const fan = await makeUser(t, "fan@example.com", "user");
    const commerceId = await insertCommerce(t, owner, {
      name: "Se elimina",
      category: "Tecnología",
      estado: "publicado",
    });

    // Everything Convex Auth + the product hold around the account.
    const accountId = await t.run((ctx) =>
      ctx.db.insert("authAccounts", {
        userId: owner,
        provider: "password",
        providerAccountId: "negocio@example.com",
        secret: "hash",
      }),
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("authVerificationCodes", {
        accountId,
        provider: "password",
        code: "123456",
        expirationTime: Date.now() + 60_000,
      });
      const sessionId = await ctx.db.insert("authSessions", {
        userId: owner,
        expirationTime: Date.now() + 60_000,
      });
      await ctx.db.insert("authRefreshTokens", {
        sessionId,
        expirationTime: Date.now() + 60_000,
      });
      // The owner saved someone; someone saved the fiche; the fiche has stats.
      await ctx.db.insert("favorites", { userId: owner, commerceId });
      await ctx.db.insert("favorites", { userId: fan, commerceId });
      await ctx.db.insert("events", {
        type: "whatsapp_click",
        commerceId,
        timestamp: Date.now(),
        visitorId: "anon-1",
      });
    });

    await t
      .withIdentity({ subject: admin })
      .mutation(api.table.adminCommerces.removeCommerce, { commerceId });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(commerceId)).toBeNull();
      expect(await ctx.db.get(owner)).toBeNull();
      expect(await ctx.db.query("authAccounts").collect()).toEqual([]);
      expect(await ctx.db.query("authVerificationCodes").collect()).toEqual([]);
      expect(await ctx.db.query("authSessions").collect()).toEqual([]);
      expect(await ctx.db.query("authRefreshTokens").collect()).toEqual([]);
      expect(await ctx.db.query("favorites").collect()).toEqual([]);
      expect(await ctx.db.query("events").collect()).toEqual([]);
      // The bystanders survive.
      expect(await ctx.db.get(fan)).not.toBeNull();
      expect(await ctx.db.get(admin)).not.toBeNull();
    });
  });

  test("nunca elimina una cuenta admin al borrar su ficha", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const commerceId = await insertCommerce(t, admin, {
      name: "Ficha del admin",
      category: "Tecnología",
      estado: "publicado",
    });

    await t
      .withIdentity({ subject: admin })
      .mutation(api.table.adminCommerces.removeCommerce, { commerceId });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(commerceId)).toBeNull();
      expect(await ctx.db.get(admin)).not.toBeNull();
    });
  });

  test("removes a fiche from any estado", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    for (const estado of ["pendiente", "publicado", "suspendido"] as const) {
      const id = await insertCommerce(t, owner, {
        name: `Del-${estado}`,
        category: "Tecnología",
        estado,
      });
      await t
        .withIdentity({ subject: admin })
        .mutation(api.table.adminCommerces.removeCommerce, { commerceId: id });
      expect(await estadoOf(t, admin, id)).toBeUndefined();
    }
    const all = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.listCommerces, {});
    expect(all).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// reorderCategory — manual public order within a category (Ronda 3).
// -----------------------------------------------------------------------------

async function publicNames(
  t: ReturnType<typeof convexTest>,
  category: string,
): Promise<string[]> {
  const sections = await t.query(api.table.commerces.listPublicByCategory, {});
  return (
    sections
      .find((s) => s.category === category)
      ?.commerces.map((c) => c.name) ?? []
  );
}

describe("reorderCategory", () => {
  test("refuses anonymous and non-admin callers", async () => {
    const t = convexTest(schema, modules);
    const entre = await makeUser(t, "e@example.com", "entreprise");
    const id = await insertCommerce(t, entre, {
      name: "N",
      category: "Tecnología",
      estado: "publicado",
    });

    await expect(
      t.mutation(api.table.adminCommerces.reorderCategory, {
        category: "Tecnología",
        orderedIds: [id],
      }),
    ).rejects.toThrow();
    await expect(
      t.withIdentity({ subject: entre }).mutation(
        api.table.adminCommerces.reorderCategory,
        { category: "Tecnología", orderedIds: [id] },
      ),
    ).rejects.toThrow();
  });

  test("the public listing follows the admin order instead of creation order", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const first = await insertCommerce(t, owner, {
      name: "Primera",
      category: "Tecnología",
      estado: "publicado",
    });
    const second = await insertCommerce(t, owner, {
      name: "Segunda",
      category: "Tecnología",
      estado: "publicado",
    });
    const third = await insertCommerce(t, owner, {
      name: "Tercera",
      category: "Tecnología",
      estado: "publicado",
    });

    // Without a manual order: creation order.
    expect(await publicNames(t, "Tecnología")).toEqual([
      "Primera",
      "Segunda",
      "Tercera",
    ]);

    await t.withIdentity({ subject: admin }).mutation(
      api.table.adminCommerces.reorderCategory,
      { category: "Tecnología", orderedIds: [third, first, second] },
    );

    expect(await publicNames(t, "Tecnología")).toEqual([
      "Tercera",
      "Primera",
      "Segunda",
    ]);
  });

  test("a fiche published after the reorder lands at the end of its category", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const a = await insertCommerce(t, owner, {
      name: "A",
      category: "Mascotas",
      estado: "publicado",
    });
    const b = await insertCommerce(t, owner, {
      name: "B",
      category: "Mascotas",
      estado: "publicado",
    });
    const pending = await insertCommerce(t, owner, {
      name: "Nueva",
      category: "Mascotas",
      estado: "pendiente",
    });

    await t.withIdentity({ subject: admin }).mutation(
      api.table.adminCommerces.reorderCategory,
      { category: "Mascotas", orderedIds: [b, a] },
    );
    await t.withIdentity({ subject: admin }).mutation(
      api.table.adminCommerces.approveCommerce,
      { commerceId: pending },
    );

    expect(await publicNames(t, "Mascotas")).toEqual(["B", "A", "Nueva"]);
  });

  test("rejects an id from another category and rolls the whole order back", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const tec1 = await insertCommerce(t, owner, {
      name: "Tec 1",
      category: "Tecnología",
      estado: "publicado",
    });
    const tec2 = await insertCommerce(t, owner, {
      name: "Tec 2",
      category: "Tecnología",
      estado: "publicado",
    });
    const intruder = await insertCommerce(t, owner, {
      name: "Mascota",
      category: "Mascotas",
      estado: "publicado",
    });

    await expect(
      t.withIdentity({ subject: admin }).mutation(
        api.table.adminCommerces.reorderCategory,
        { category: "Tecnología", orderedIds: [tec2, intruder, tec1] },
      ),
    ).rejects.toThrow();

    // The transaction rolled back: tec2 keeps NO sortOrder → creation order.
    expect(await publicNames(t, "Tecnología")).toEqual(["Tec 1", "Tec 2"]);
  });
});

// -----------------------------------------------------------------------------
// Internal fields — visible to the admin, stripped from the public queries.
// -----------------------------------------------------------------------------

describe("internal fields exposure", () => {
  test("getCommerceForAdmin exposes resides/notas; getPublicById strips them", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const id = await insertCommerce(t, owner, {
      name: "Fiche",
      category: "Mascotas",
      estado: "publicado",
    });

    const adminDoc = (await t
      .withIdentity({ subject: admin })
      .query(api.table.adminCommerces.getCommerceForAdmin, {
        commerceId: id,
      })) as Record<string, unknown> | null;
    expect(adminDoc?.resides).toBe("Resido en Monteazul");
    expect(adminDoc?.notas).toBe("Nota interna confidencial");

    const publicDoc = (await t.query(api.table.commerces.getPublicById, {
      id,
    })) as Record<string, unknown> | null;
    expect(publicDoc).not.toBeNull();
    expect(publicDoc?.resides).toBeUndefined();
    expect(publicDoc?.notas).toBeUndefined();
    expect(publicDoc?.estado).toBeUndefined();
    expect(publicDoc?.ownerId).toBeUndefined();
  });
});
