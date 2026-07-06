import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("seedDev", () => {
  test("creates roughly fifteen invented commerces owned by @example.com accounts", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(internal.seed.seedDev, {});
    expect(result.count).toBeGreaterThanOrEqual(15);

    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(commerces.length).toBe(result.count);

    // Every owner account uses a fictional @example.com email — no real data.
    const owners = await t.run((ctx) => ctx.db.query("users").collect());
    expect(owners.length).toBeGreaterThanOrEqual(15);
    for (const owner of owners) {
      expect(owner.email).toMatch(/@example\.com$/);
      expect(owner.role).toBe("entreprise");
    }
  });

  test("is replayable (idempotent) — a second run does not duplicate data", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.seed.seedDev, {});
    const second = await t.mutation(internal.seed.seedDev, {});
    expect(second.count).toBe(first.count);

    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());
    expect(commerces.length).toBe(first.count);

    const emails = (await t.run((ctx) => ctx.db.query("users").collect())).map(
      (u) => u.email,
    );
    expect(new Set(emails).size).toBe(emails.length); // no duplicate owners
  });

  test("covers all nine categories, all Comida sub-categories and the three estados", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.seedDev, {});
    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());

    const categories = new Set(commerces.map((c) => c.category));
    for (const category of [
      "Comida y bebida",
      "Mascotas",
      "Belleza y cuidado personal",
      "Salud y bienestar",
      "Accesorios y ropa",
      "Hogar y artesanías",
      "Tecnología",
      "Inmuebles y servicios",
      "Otro",
    ]) {
      expect(categories.has(category)).toBe(true);
    }

    const estados = new Set(commerces.map((c) => c.estado));
    expect(estados).toEqual(new Set(["pendiente", "publicado", "suspendido"]));

    const subs = new Set(commerces.flatMap((c) => c.subcategories ?? []));
    for (const sub of [
      "Almuerzos y comida típica",
      "Panadería y repostería",
      "Carnes y embutidos",
      "Frutas y mercado",
      "Snacks y saludables",
      "Helados y postres",
      "Otros",
    ]) {
      expect(subs.has(sub)).toBe(true);
    }
  });

  test("includes both plages and disponible horarios", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.seedDev, {});
    const commerces = await t.run((ctx) => ctx.db.query("commerces").collect());
    const modes = new Set(commerces.map((c) => c.horario?.mode));
    expect(modes.has("plages")).toBe(true);
    expect(modes.has("disponible")).toBe(true);
  });

  test("feeds the public listing — only publicado seeded fiches are visible", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.seedDev, {});
    const sections = await t.query(api.table.commerces.listPublicByCategory, {});
    const visible = sections.flatMap((s) => s.commerces);
    expect(visible.length).toBeGreaterThan(0);

    const allPublicadoCount = (
      await t.run((ctx) => ctx.db.query("commerces").collect())
    ).filter((c) => c.estado === "publicado").length;
    expect(visible.length).toBe(allPublicadoCount);
  });
});
