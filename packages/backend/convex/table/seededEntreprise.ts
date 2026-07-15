import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  assertValidCommerceForm,
  commerceWriteFields,
  horarioValidator,
} from "../lib/commerce";
import {
  createSeededPasswordAccount,
  generateStrongPassword,
} from "../lib/auth/seededAccount";
import {
  submittedPhotoValidator,
  validatedPhotoAttachments,
} from "./commerces";
import { requireAdmin } from "../rbac";

/**
 * Seeded `entreprise` account creation — the back-office onboarding channel for
 * merchants recruited by WhatsApp (PRD #1 / `docs/product/annuaire-spec.md` §8).
 *
 * From the admin panel the Super admin fills the merchant's email plus a fiche
 * (the SAME fields and validations as the entrepreneur form, reused from
 * `lib/commerce`) and the system creates, in a single transaction:
 *  - a `users` account with the stored role `entreprise`,
 *  - its Password-provider `authAccounts` credential holding a HASHED,
 *    strong, single-use password (returned ONCE to the admin, never re-readable),
 *  - the Commerce, attached 1:1 and published directly (`publicado`).
 *
 * No email is ever sent (explicit criterion): the credentials are transmitted
 * manually by WhatsApp, out of product. The admin surface is guarded by
 * `requireAdmin`.
 */

/** Minimal, permissive email shape check — a clear error beats a bad account. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createSeededEntreprise = mutation({
  args: {
    email: v.string(),
    // Fiche fields — identical to `submitCommerce` (entrepreneur form).
    name: v.string(),
    category: v.string(),
    subcategories: v.optional(v.array(v.string())),
    description: v.string(),
    infoExtra: v.optional(v.string()),
    whatsapp: v.string(),
    horario: horarioValidator,
    instagram: v.optional(v.string()),
    contactName: v.optional(v.string()),
    resides: v.string(),
    notas: v.optional(v.string()),
    // Pre-uploaded vitrine photos (see `generateSubmissionUploadUrl`), same
    // contract and validation as `submitCommerce` — order = vitrine order.
    photos: v.optional(v.array(submittedPhotoValidator)),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new ConvexError({
        message: "El correo electrónico no es válido.",
      });
    }

    // Same business-rule validation as the entrepreneur form — surfaced in
    // Spanish, BEFORE any write so a rejection leaves nothing behind.
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

    // Strong, single-use password shown ONCE and only ever stored hashed.
    const password = generateStrongPassword();
    const ownerId = await createSeededPasswordAccount(ctx, {
      email,
      name: args.contactName,
      password,
      role: "entreprise",
    });

    const photos = await validatedPhotoAttachments(ctx, args.photos);

    // Admin-created fiches are published directly (no approval queue).
    await ctx.db.insert("commerces", {
      ...commerceWriteFields(args),
      photos,
      estado: "publicado",
      ownerId,
    });

    return { email, password };
  },
});
