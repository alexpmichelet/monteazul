import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  assertValidCommerceForm,
  commerceWriteFields,
  horarioValidator,
} from "./lib/commerce";
import { createSeededPasswordAccount } from "./lib/auth/seededAccount";

/**
 * One-shot bootstrap of a seeded `entreprise` account + its fiche — the CLI
 * twin of `createSeededEntreprise` (same validations, same 1 account = 1 fiche
 * shape) for the manual Notion import into production.
 *
 * Differences with the admin-panel mutation, all deliberate:
 *  - `internalMutation`: only callable from the CLI / dashboard, no session
 *    needed — the operator IS the Super admin.
 *  - The PASSWORD is an ARGUMENT: the operator hands credentials to merchants
 *    by WhatsApp, so they choose (and keep) the password themselves. It is
 *    only ever stored hashed, and never lives in the codebase.
 *  - `estado` is an argument (`pendiente` | `publicado`) so the import can
 *    mirror the Notion « Estado » column instead of publishing everything.
 *  - No photos: the Notion export references files we don't have; merchants
 *    add their vitrine from « Mi negocio » afterwards.
 *
 * No email is ever sent. Run with e.g.
 *   npx convex run bootstrapEntreprise:bootstrapEntreprise '<json args>' --prod
 */

/** Minimal, permissive email shape check — a clear error beats a bad account. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const bootstrapEntreprise = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
    estado: v.union(v.literal("pendiente"), v.literal("publicado")),
    // Fiche fields — identical to `createSeededEntreprise`.
    name: v.string(),
    category: v.string(),
    subcategories: v.optional(v.array(v.string())),
    description: v.string(),
    whatsapp: v.string(),
    horario: horarioValidator,
    torreApto: v.optional(v.string()),
    instagram: v.optional(v.string()),
    contactName: v.optional(v.string()),
    resides: v.string(),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new ConvexError({ message: "El correo electrónico no es válido." });
    }
    if (args.password.length < 12) {
      throw new ConvexError({
        message: "La contraseña debe tener al menos 12 caracteres.",
      });
    }

    // Same business-rule validation as the entrepreneur/admin forms.
    try {
      assertValidCommerceForm(args);
    } catch (error) {
      throw new ConvexError({
        message: error instanceof Error ? error.message : "Datos inválidos.",
      });
    }

    // Reject an already-used email before writing anything (no partial write).
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new ConvexError({
        message: "Ya existe una cuenta con este correo electrónico.",
      });
    }

    const ownerId = await createSeededPasswordAccount(ctx, {
      email,
      name: args.contactName,
      password: args.password,
      role: "entreprise",
    });

    await ctx.db.insert("commerces", {
      ...commerceWriteFields(args),
      photos: [],
      estado: args.estado,
      ownerId,
    });

    return { email, name: args.name, estado: args.estado };
  },
});
