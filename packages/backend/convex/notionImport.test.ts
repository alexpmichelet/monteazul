import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import fixtureCsv from "./lib/import/fixtures/notion-export.fixture.csv?raw";
import horarioMap from "./lib/import/fixtures/notion-horario-map.fixture.json";
import { verifySecret } from "./lib/auth/passwordCrypto";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all modules.
const modules = import.meta.glob("./**/*.*s");

// Seeding several accounts per import runs Scrypt password hashing (deliberately
// slow) five times per run — well over the 5s default on a slow CI runner. Give
// this file a generous per-test budget; the assertions themselves are instant.
vi.setConfig({ testTimeout: 30000 });

/** Store a 1 KB image blob and return its storage id. */
async function storeImage(
  t: ReturnType<typeof convexTest>,
): Promise<Id<"_storage">> {
  return await t.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array(1024)], { type: "image/jpeg" })),
  );
}

/** Run the import against the versioned invented fixture. */
async function runImport(
  t: ReturnType<typeof convexTest>,
  photosByEmail?: Record<string, Id<"_storage">[]>,
) {
  return await t.mutation(internal.notionImport.importFromNotion, {
    csv: fixtureCsv,
    horarioMap,
    photosByEmail,
  });
}

// A CSV with a duplicate Correo — inline, 100% invented. Header matches the
// Notion contract; the two rows share the same email (case-insensitively).
const DUP_HEADER =
  'Created time,Nombre del negocio,Descripción,Categoría,"Subcategoría ",WhatsApp,Nombre de contacto,Correo,Instagram / redes,Horario,PDF (portafolio),Fotos,¿Resides en Monteazul?,Torre y apartamento,"Notas ",Estado';
const DUP_CSV = [
  DUP_HEADER,
  "d,Uno,desc,Mascotas,,3201110001,,dup@example.com,,,,,Resido en Monteazul,,,Publicado",
  "d,Dos,desc,Mascotas,,3201110002,,DUP@example.com,,,,,Resido en Monteazul,,,Publicado",
].join("\n");

// ---------------------------------------------------------------------------
// Duplicate Correo → failure with report and ZERO writes.
// ---------------------------------------------------------------------------

describe("importFromNotion — duplicate Correo aborts with zero writes", () => {
  test("returns ok:false with the duplicate listed and writes nothing", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(internal.notionImport.importFromNotion, {
      csv: DUP_CSV,
      horarioMap,
    });

    expect(result.ok).toBe(false);
    expect(result.report.duplicateCorreos).toContain("dup@example.com");

    // No account, no commerce, no credential — nothing was written.
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(0);
    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(commerces).toHaveLength(0);
    const accounts = await t.run((ctx) =>
      ctx.db.query("authAccounts").collect(),
    );
    expect(accounts).toHaveLength(0);
    expect(result.credentials).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Accounts + fiches + photos created from the fixture.
// ---------------------------------------------------------------------------

describe("importFromNotion — accounts, fiches and photos", () => {
  test("creates one `entreprise` account per Correo, each with its fiche 1:1", async () => {
    const t = convexTest(schema, modules);
    const result = await runImport(t);

    expect(result.ok).toBe(true);
    expect(result.created).toHaveLength(5);

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(5);
    expect(users.every((u) => u.role === "entreprise")).toBe(true);

    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(commerces).toHaveLength(5);
    // 1:1 — every commerce points at a distinct owner.
    const owners = new Set(commerces.map((c) => c.ownerId));
    expect(owners.size).toBe(5);
  });

  test("applies the mapped Estado to each created fiche", async () => {
    const t = convexTest(schema, modules);
    await runImport(t);

    const byName = async (name: string) =>
      await t.run((ctx) =>
        ctx.db
          .query("commerces")
          .filter((q) => q.eq(q.field("name"), name))
          .first(),
      );

    expect((await byName("Arepas La Esquina"))!.estado).toBe("publicado");
    expect((await byName("Panadería Los Trigos"))!.estado).toBe("publicado");
    expect((await byName("TecnoArreglos MZ"))!.estado).toBe("pendiente");
  });

  test("attaches the uploaded photos to each fiche, preserving order", async () => {
    const t = convexTest(schema, modules);
    const a1 = await storeImage(t);
    const a2 = await storeImage(t);
    const e1 = await storeImage(t);

    await runImport(t, {
      "arepas.laesquina@example.com": [a1, a2],
      "belleza.aura@example.com": [e1],
    });

    const arepas = await t.run((ctx) =>
      ctx.db
        .query("commerces")
        .filter((q) => q.eq(q.field("name"), "Arepas La Esquina"))
        .first(),
    );
    expect(arepas!.photos).toEqual([a1, a2]);

    const belleza = await t.run((ctx) =>
      ctx.db
        .query("commerces")
        .filter((q) => q.eq(q.field("name"), "Estudio Belleza Aura"))
        .first(),
    );
    expect(belleza!.photos).toEqual([e1]);
  });

  test("the published fiches are immediately visible in the public annuaire", async () => {
    const t = convexTest(schema, modules);
    await runImport(t);
    const sections = await t.query(
      api.table.commerces.listPublicByCategory,
      {},
    );
    const names = sections.flatMap((s) => s.commerces.map((c) => c.name));
    expect(names).toContain("Arepas La Esquina");
    expect(names).not.toContain("TecnoArreglos MZ"); // pendiente
  });
});

// ---------------------------------------------------------------------------
// Anti-double-run guard: re-running does not duplicate anything.
// ---------------------------------------------------------------------------

describe("importFromNotion — idempotent re-run", () => {
  test("a second run creates nothing new and skips the existing accounts", async () => {
    const t = convexTest(schema, modules);
    await runImport(t);
    const second = await runImport(t);

    expect(second.created).toHaveLength(0);
    expect(second.skipped).toHaveLength(5);

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(5);
    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(commerces).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// No email is ever sent during the import.
// ---------------------------------------------------------------------------

describe("importFromNotion — no email", () => {
  test("schedules no job (no email) while importing", async () => {
    const t = convexTest(schema, modules);
    await runImport(t);
    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(scheduled).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Generated passwords: strong, usable to log in, never persisted in clear.
// ---------------------------------------------------------------------------

describe("importFromNotion — credentials", () => {
  test("returns one strong password per created account, only ever stored hashed", async () => {
    const t = convexTest(schema, modules);
    const result = await runImport(t);

    expect(result.credentials).toHaveLength(5);
    for (const { password } of result.credentials) {
      expect(password.length).toBeGreaterThanOrEqual(16);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
    }

    const { email, password } = result.credentials.find(
      (c) => c.email === "arepas.laesquina@example.com",
    )!;

    const account = await t.run((ctx) =>
      ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .unique(),
    );
    expect(account!.emailVerified).toBeTruthy();
    expect(account!.secret).not.toBe(password);
    expect(await verifySecret(password, account!.secret!)).toBe(true);

    // The plaintext password is nowhere in the stored rows.
    const owner = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first(),
    );
    expect(JSON.stringify(owner)).not.toContain(password);
    expect(JSON.stringify(account)).not.toContain(password);
  });
});

// ---------------------------------------------------------------------------
// validate — dry-run: report only, no write.
// ---------------------------------------------------------------------------

describe("validate — dry run", () => {
  test("returns the report and the importable emails without writing", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(internal.notionImport.validate, {
      csv: fixtureCsv,
      horarioMap,
    });

    expect(result.report.ok).toBe(true);
    expect(result.report.importable).toBe(5);
    expect(result.fiches.map((f) => f.correo)).toContain(
      "arepas.laesquina@example.com",
    );

    // A query cannot write; assert the base stays empty anyway.
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(0);
  });
});
