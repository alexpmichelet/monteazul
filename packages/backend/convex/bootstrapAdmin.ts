import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  createSeededPasswordAccount,
  generateStrongPassword,
} from "./lib/auth/seededAccount";

/**
 * One-shot bootstrap of a Super admin account — the manual DB seed the MVP
 * uses instead of an in-app "add admin" flow (the Team page is disabled).
 *
 * The email is an ARGUMENT, never hardcoded: no real personal data lives in
 * the code. The account is created with a strong random password that is
 * immediately DISCARDED (not returned, not logged): the admin claims the
 * account through « Olvidé mi contraseña », which emails an OTP — so this
 * mutation itself never sends anything.
 *
 * Internal: only callable from the CLI / dashboard, e.g.
 *   npx convex run bootstrapAdmin:bootstrapAdmin '{"email":"admin@example.com"}' --prod
 */

/** Minimal, permissive email shape check — a clear error beats a bad account. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const bootstrapAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new ConvexError({ message: "El correo electrónico no es válido." });
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new ConvexError({
        message: "Ya existe una cuenta con este correo electrónico.",
      });
    }

    // Random password, discarded on purpose — the admin sets their real one
    // through the password-reset flow (OTP email).
    await createSeededPasswordAccount(ctx, {
      email,
      password: generateStrongPassword(),
      role: "admin",
    });

    return { email, role: "admin" as const };
  },
});
