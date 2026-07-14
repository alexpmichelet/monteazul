import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { deleteAccountCascade } from "./table/adminCommerces";

/**
 * One-off CLI repair (Ronda 10): free a correo left ORPHANED by fiche
 * deletions that predate the full-cascade `removeCommerce` — the fiche is
 * gone but the account and its Convex Auth credentials linger, so the correo
 * cannot register again. Deletes the account through the same cascade the
 * admin removal now uses.
 *
 * Refuses an admin account and any account that still OWNS a fiche (those
 * must go through `removeCommerce`). CLI-only:
 *
 *   npx convex run cleanupOrphanAccount:cleanupOrphanAccount '{"email":"<correo>"}' --prod
 */
export const cleanupOrphanAccount = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (!user) {
      throw new ConvexError({ message: "No existe una cuenta con ese correo." });
    }
    if (user.role === "admin") {
      throw new ConvexError({ message: "Una cuenta admin no se elimina por CLI." });
    }
    const commerce = await ctx.db
      .query("commerces")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();
    if (commerce) {
      throw new ConvexError({
        message:
          "La cuenta todavía tiene una ficha — elimínala desde el panel de administración (removeCommerce hace la cascada completa).",
      });
    }
    await deleteAccountCascade(ctx, user._id);
    return { deleted: args.email };
  },
});
