import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { assignDefaultRole, requireAdmin, requireEntreprise } from "./rbac";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all function modules.
const modules = import.meta.glob("./**/*.*s");

describe("requireAdmin", () => {
  test("refuses an anonymous caller (Visiteur)", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.run(async (ctx) => await requireAdmin(ctx))
    ).rejects.toThrow();
  });

  test("refuses a caller with the wrong role (user)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "u@example.com", role: "user" })
    );
    await expect(
      t
        .withIdentity({ subject: userId })
        .run(async (ctx) => await requireAdmin(ctx))
    ).rejects.toThrow();
  });

  test("refuses a caller with the wrong role (entreprise)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "e@example.com", role: "entreprise" })
    );
    await expect(
      t
        .withIdentity({ subject: userId })
        .run(async (ctx) => await requireAdmin(ctx))
    ).rejects.toThrow();
  });

  test("accepts a Super admin caller", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "a@example.com", role: "admin" })
    );
    const result = await t
      .withIdentity({ subject: userId })
      .run(async (ctx) => await requireAdmin(ctx));
    expect(result.userId).toBe(userId);
    expect(result.user.role).toBe("admin");
  });
});

describe("requireEntreprise", () => {
  test("refuses an anonymous caller (Visiteur)", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.run(async (ctx) => await requireEntreprise(ctx))
    ).rejects.toThrow();
  });

  test("refuses a caller with the wrong role (user)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "u@example.com", role: "user" })
    );
    await expect(
      t
        .withIdentity({ subject: userId })
        .run(async (ctx) => await requireEntreprise(ctx))
    ).rejects.toThrow();
  });

  test("refuses a caller with the wrong role (admin)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "a@example.com", role: "admin" })
    );
    await expect(
      t
        .withIdentity({ subject: userId })
        .run(async (ctx) => await requireEntreprise(ctx))
    ).rejects.toThrow();
  });

  test("accepts an Entrepreneur caller", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "e@example.com", role: "entreprise" })
    );
    const result = await t
      .withIdentity({ subject: userId })
      .run(async (ctx) => await requireEntreprise(ctx));
    expect(result.userId).toBe(userId);
    expect(result.user.role).toBe("entreprise");
  });
});

describe("assignDefaultRole", () => {
  test("assigns the default role 'user' to a newly created account", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "new@example.com" })
    );
    await t.run(
      async (ctx) =>
        await assignDefaultRole(ctx, { userId, existingUserId: null })
    );
    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("user");
  });

  test("does not overwrite the role of an existing account on sign-in", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "e@example.com", role: "entreprise" })
    );
    await t.run(
      async (ctx) =>
        await assignDefaultRole(ctx, { userId, existingUserId: userId })
    );
    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("entreprise");
  });

  test("does not overwrite an already-assigned role (admin invite safety)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "a@example.com", role: "admin" })
    );
    await t.run(
      async (ctx) =>
        await assignDefaultRole(ctx, { userId, existingUserId: null })
    );
    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("admin");
  });
});
