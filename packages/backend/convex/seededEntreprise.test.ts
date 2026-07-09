import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { verifySecret } from "./lib/auth/passwordCrypto";
import { generateStrongPassword } from "./lib/auth/seededAccount";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all modules.
const modules = import.meta.glob("./**/*.*s");

type Role = "user" | "entreprise" | "admin";

/** Insert a bare account with a given role and return its id. */
async function makeUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: Role,
): Promise<Id<"users">> {
  return await t.run((ctx) => ctx.db.insert("users", { email, role }));
}

/** A fully valid fiche payload (Comida y bebida, semanal Horario). */
const validFiche = {
  name: "Panadería El Sol",
  category: "Comida y bebida",
  subcategories: ["Panadería y repostería"],
  description: "Pan artesanal horneado a diario en el barrio.",
  whatsapp: "3182173887",
  horario: { mode: "semanal" as const, windows: [{ dayOfWeek: 1, from: 450, to: 960 }] },
  torreApto: "Torre 4 · Apto 926",
  instagram: "https://instagram.com/panaderiaelsol",
  contactName: "María López",
  resides: "Resido en Monteazul" as const,
  notas: "Pagos en efectivo y Nequi.",
};

/** Create an admin and return a caller bound to its identity. */
async function asAdmin(t: ReturnType<typeof convexTest>) {
  const adminId = await makeUser(t, "admin@example.com", "admin");
  return { adminId, admin: t.withIdentity({ subject: adminId }) };
}

/** Store a blob in Convex storage and return its id (defaults: 1 KB image). */
async function storeImage(
  t: ReturnType<typeof convexTest>,
  opts?: { type?: string; bytes?: number },
): Promise<Id<"_storage">> {
  const type = opts?.type ?? "image/jpeg";
  const bytes = opts?.bytes ?? 1024;
  return await t.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })),
  );
}

// ---------------------------------------------------------------------------
// generateStrongPassword — strong, single-use, non-persisted credential.
// ---------------------------------------------------------------------------

describe("generateStrongPassword", () => {
  test("genera una contraseña larga con las cuatro clases de caracteres", () => {
    const pwd = generateStrongPassword();
    expect(pwd.length).toBeGreaterThanOrEqual(16);
    expect(pwd).toMatch(/[a-z]/);
    expect(pwd).toMatch(/[A-Z]/);
    expect(pwd).toMatch(/[0-9]/);
    expect(pwd).toMatch(/[^A-Za-z0-9]/);
  });

  test("es aleatoria (dos llamadas no coinciden)", () => {
    const a = generateStrongPassword();
    const b = generateStrongPassword();
    expect(a).not.toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// Admin-only guard.
// ---------------------------------------------------------------------------

describe("createSeededEntreprise — admin only", () => {
  test("rechaza un visitante anónimo", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.table.seededEntreprise.createSeededEntreprise, {
        email: "nuevo@example.com",
        ...validFiche,
      }),
    ).rejects.toThrow();
  });

  test("rechaza un rol `user`", async () => {
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "u@example.com", "user");
    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.table.seededEntreprise.createSeededEntreprise, {
          email: "nuevo@example.com",
          ...validFiche,
        }),
    ).rejects.toThrow();
  });

  test("rechaza un rol `entreprise`", async () => {
    const t = convexTest(schema, modules);
    const entreId = await makeUser(t, "e@example.com", "entreprise");
    await expect(
      t
        .withIdentity({ subject: entreId })
        .mutation(api.table.seededEntreprise.createSeededEntreprise, {
          email: "nuevo@example.com",
          ...validFiche,
        }),
    ).rejects.toThrow();
  });

  test("acepta un rol `admin`", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    const result = await admin.mutation(
      api.table.seededEntreprise.createSeededEntreprise,
      { email: "nuevo@example.com", ...validFiche },
    );
    expect(result.email).toBe("nuevo@example.com");
  });
});

// ---------------------------------------------------------------------------
// Cuenta `entreprise` + fiche `publicado` rattachée 1:1.
// ---------------------------------------------------------------------------

describe("createSeededEntreprise — cuenta y ficha", () => {
  test("crea una cuenta `entreprise` con la ficha `publicado` rattachée 1:1", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);

    const result = await admin.mutation(
      api.table.seededEntreprise.createSeededEntreprise,
      { email: "sazon.abuela@example.com", ...validFiche },
    );

    // Compte créé avec le rôle `entreprise`.
    const owner = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", "sazon.abuela@example.com"))
        .first(),
    );
    expect(owner).not.toBeNull();
    expect(owner!.role).toBe("entreprise");
    expect(result.email).toBe("sazon.abuela@example.com");

    // Fiche rattachée (1:1) et directement `publicado`.
    const commerces = await t.run((ctx) =>
      ctx.db
        .query("commerces")
        .withIndex("by_owner", (q) => q.eq("ownerId", owner!._id))
        .collect(),
    );
    expect(commerces).toHaveLength(1);
    expect(commerces[0].estado).toBe("publicado");
    expect(commerces[0].name).toBe("Panadería El Sol");
    expect(commerces[0].whatsapp).toBe("3182173887");
    // Champs internes conservés.
    expect(commerces[0].resides).toBe("Resido en Monteazul");
    // Haystack de recherche recalculé (accents pliés).
    expect(commerces[0].searchText).toContain("panaderia");
  });

  test("la ficha `publicado` es visible de inmediato en el annuaire público", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
      email: "visible@example.com",
      ...validFiche,
    });

    const sections = await t.query(
      api.table.commerces.listPublicByCategory,
      {},
    );
    const names = sections.flatMap((s) => s.commerces.map((c) => c.name));
    expect(names).toContain("Panadería El Sol");
  });
});

// ---------------------------------------------------------------------------
// Login funciona con la contraseña generada; el secreto nunca en claro.
// ---------------------------------------------------------------------------

describe("createSeededEntreprise — fotos a la creación", () => {
  test("adjunta las fotos pre-subidas en orden (primera = Portada)", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    const first = await storeImage(t);
    const second = await storeImage(t);

    await admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
      email: "confotos@example.com",
      ...validFiche,
      photos: [
        { storageId: first, contentType: "image/jpeg" },
        { storageId: second, contentType: "image/jpeg" },
      ],
    });

    const commerce = await t.run((ctx) =>
      ctx.db.query("commerces").first(),
    );
    expect(commerce?.photos).toEqual([first, second]);
    expect(commerce?.estado).toBe("publicado");
  });

  test("ignora y elimina un blob no-imagen o demasiado pesado, conserva los válidos", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    const valid = await storeImage(t);
    const notImage = await storeImage(t, { type: "application/pdf" });

    await admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
      email: "fotos-invalidas@example.com",
      ...validFiche,
      photos: [
        { storageId: notImage, contentType: "application/pdf" },
        { storageId: valid, contentType: "image/jpeg" },
      ],
    });

    const commerce = await t.run((ctx) =>
      ctx.db.query("commerces").first(),
    );
    expect(commerce?.photos).toEqual([valid]);
    expect(await t.run((ctx) => ctx.db.system.get(notImage))).toBeNull();
  });

  test("un Super admin obtiene una URL de subida aunque posea su propia ficha", async () => {
    const t = convexTest(schema, modules);
    const { adminId, admin } = await asAdmin(t);
    // The admin owns a fiche of their own — the 1:1 mirror must not block the
    // seeded-account flow for them.
    await t.run(async (ctx) => {
      await ctx.db.insert("commerces", {
        name: "Ficha del admin",
        category: "Otro",
        description: "Ficha propia del admin.",
        searchText: "ficha del admin otro ficha propia del admin.",
        whatsapp: "3000000001",
        photos: [],
        resides: "Resido en Monteazul",
        estado: "publicado",
        ownerId: adminId,
      });
    });

    const url = await admin.mutation(
      api.table.commerces.generateSubmissionUploadUrl,
      {},
    );
    expect(typeof url).toBe("string");
  });
});

describe("createSeededEntreprise — credenciales", () => {
  test("la contraseña devuelta es fuerte y permite iniciar sesión", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);

    const { email, password } = await admin.mutation(
      api.table.seededEntreprise.createSeededEntreprise,
      { email: "login@example.com", ...validFiche },
    );

    // Contraseña fuerte.
    expect(password.length).toBeGreaterThanOrEqual(16);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);

    // Un `authAccount` password apunta a la cuenta, con el correo pre-verificado
    // (de lo contrario, el proveedor Password bloquearía el login con un OTP).
    const account = await t.run((ctx) =>
      ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .unique(),
    );
    expect(account).not.toBeNull();
    expect(account!.emailVerified).toBeTruthy();

    // El secreto está hasheado (nunca en claro) y verifica la contraseña.
    expect(account!.secret).toBeDefined();
    expect(account!.secret).not.toBe(password);
    expect(await verifySecret(password, account!.secret!)).toBe(true);
    expect(await verifySecret("contraseña-incorrecta", account!.secret!)).toBe(
      false,
    );
  });

  test("no existe ninguna query que vuelva a exponer la contraseña en claro", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    const { email, password } = await admin.mutation(
      api.table.seededEntreprise.createSeededEntreprise,
      { email: "noreexpose@example.com", ...validFiche },
    );

    // La contraseña en claro no se persiste en ninguna parte.
    const owner = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first(),
    );
    expect(JSON.stringify(owner)).not.toContain(password);
    const account = await t.run((ctx) =>
      ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .unique(),
    );
    expect(JSON.stringify(account)).not.toContain(password);
  });
});

// ---------------------------------------------------------------------------
// Ningún email enviado (criterio explícito).
// ---------------------------------------------------------------------------

describe("createSeededEntreprise — sin email", () => {
  test("no programa ningún job (ningún email)", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
      email: "sinemail@example.com",
      ...validFiche,
    });

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(scheduled).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Correo ya utilizado → error claro, sin escritura parcial.
// ---------------------------------------------------------------------------

describe("createSeededEntreprise — correo duplicado", () => {
  test("rechaza un correo ya existente sin escritura parcial", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await makeUser(t, "taken@example.com", "user");

    const usersBefore = await t.run((ctx) =>
      ctx.db.query("users").collect(),
    );

    await expect(
      admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
        email: "taken@example.com",
        ...validFiche,
      }),
    ).rejects.toThrow();

    // Ninguna cuenta nueva, ningún negocio, ninguna authAccount.
    const usersAfter = await t.run((ctx) => ctx.db.query("users").collect());
    expect(usersAfter).toHaveLength(usersBefore.length);
    const commerces = await t.run((ctx) =>
      ctx.db.query("commerces").collect(),
    );
    expect(commerces).toHaveLength(0);
    const accounts = await t.run((ctx) =>
      ctx.db.query("authAccounts").collect(),
    );
    expect(accounts).toHaveLength(0);
  });

  test("rechaza una segunda creación con el mismo correo", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
      email: "once@example.com",
      ...validFiche,
    });

    await expect(
      admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
        email: "once@example.com",
        ...validFiche,
        name: "Segundo negocio",
      }),
    ).rejects.toThrow();

    const commerces = await t.run((ctx) =>
      ctx.db.query("commerces").collect(),
    );
    expect(commerces).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Mismas validaciones que el formulario entrepreneur, sin escritura parcial.
// ---------------------------------------------------------------------------

describe("createSeededEntreprise — validación de la ficha", () => {
  test("rechaza un WhatsApp que no tiene exactamente 10 dígitos", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await expect(
      admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
        email: "wa@example.com",
        ...validFiche,
        whatsapp: "+573182173887",
      }),
    ).rejects.toThrow(/whatsapp/i);

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    // Solo el admin existe.
    expect(users.filter((u) => u.role === "entreprise")).toHaveLength(0);
    const commerces = await t.run((ctx) =>
      ctx.db.query("commerces").collect(),
    );
    expect(commerces).toHaveLength(0);
  });

  test("rechaza subcategorías fuera de « Comida y bebida »", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await expect(
      admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
        email: "sub@example.com",
        ...validFiche,
        category: "Tecnología",
        subcategories: ["Otros"],
      }),
    ).rejects.toThrow(/comida y bebida/i);
  });

  test("rechaza un valor ¿Resides? no válido", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await expect(
      admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
        email: "res@example.com",
        ...validFiche,
        resides: "Tal vez",
      }),
    ).rejects.toThrow(/resides/i);
  });

  test("rechaza un correo con formato inválido sin escritura parcial", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await asAdmin(t);
    await expect(
      admin.mutation(api.table.seededEntreprise.createSeededEntreprise, {
        email: "no-es-un-correo",
        ...validFiche,
      }),
    ).rejects.toThrow();

    const commerces = await t.run((ctx) =>
      ctx.db.query("commerces").collect(),
    );
    expect(commerces).toHaveLength(0);
  });
});
