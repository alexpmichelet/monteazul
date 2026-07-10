import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all modules.
const modules = import.meta.glob("./**/*.*s");

describe("bootstrapAdmin — seed manuel du Super admin", () => {
  test("crée un compte admin pré-vérifié avec credential Password hashée", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(internal.bootstrapAdmin.bootstrapAdmin, {
      email: "Admin.Prod@Example.com ",
    });
    expect(result).toEqual({ email: "admin.prod@example.com", role: "admin" });

    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", "admin.prod@example.com"))
        .first(),
    );
    expect(user?.role).toBe("admin");
    expect(user?.emailVerificationTime).toBeTypeOf("number");

    // The Password credential exists and never stores the password plaintext
    // (the random password is discarded — claimed via « Olvidé mi contraseña »).
    const account = await t.run(async (ctx) =>
      (await ctx.db.query("authAccounts").collect()).find(
        (a) => a.providerAccountId === "admin.prod@example.com",
      ),
    );
    expect(account?.provider).toBe("password");
    expect(account?.emailVerified).toBe("admin.prod@example.com");
    expect(account?.secret).toBeTypeOf("string");
    expect(account?.secret?.length).toBeGreaterThan(20);
  });

  test("refuse un correo déjà utilisé (aucune écriture partielle)", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("users", { email: "taken@example.com", role: "user" }),
    );

    await expect(
      t.mutation(internal.bootstrapAdmin.bootstrapAdmin, {
        email: "taken@example.com",
      }),
    ).rejects.toThrow(/ya existe/i);

    const accounts = await t.run((ctx) => ctx.db.query("authAccounts").collect());
    expect(accounts).toHaveLength(0);
  });

  test("refuse un correo invalide", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.bootstrapAdmin.bootstrapAdmin, { email: "no-es-un-correo" }),
    ).rejects.toThrow(/no es válido/i);
  });
});
