import { getAuthUserId } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthenticated } from "../rbac";
import { toPublicCommerce } from "./commerces";

/**
 * Favori — the link between a User and a Commerce they saved (see CONTEXT.md).
 * It is the single capability reserved to the `user` role in v1. The pair is
 * unique per (User, Commerce): the mutation enforces it (Convex has no native
 * unique constraint) via the `by_user_commerce` index.
 */
const documentSchema = {
  userId: v.id("users"),
  commerceId: v.id("commerces"),
};

export const favorites = defineTable(documentSchema)
  .index("by_user", ["userId"])
  .index("by_user_commerce", ["userId", "commerceId"])
  .index("by_commerce", ["commerceId"]);

/**
 * Toggle a Favori for the authenticated User and a Commerce: creates the link
 * if absent, removes it if present. Idempotent by design — the pair can never
 * be duplicated (looked up through the unique `by_user_commerce` index). Refuses
 * an anonymous caller (Visiteur) via `requireAuthenticated`, so no Favori is
 * ever created without a session. Returns the resulting state so the UI heart
 * can reflect the DB immediately.
 */
export const toggle = mutation({
  args: { commerceId: v.id("commerces") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticated(ctx);

    // The Commerce must exist — guards against dangling favorites from a stale
    // client id. Its estado is irrelevant here: a fiche can be favorited while
    // publicado and later suspended; `listMine` filters at read time.
    const commerce = await ctx.db.get(args.commerceId);
    if (!commerce) {
      throw new Error("Commerce no encontrado.");
    }

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_commerce", (q) =>
        q.eq("userId", userId).eq("commerceId", args.commerceId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { favorited: false };
    }

    await ctx.db.insert("favorites", { userId, commerceId: args.commerceId });
    return { favorited: true };
  },
});

/**
 * The Commerce ids the current User has favorited, newest first. Backs the
 * directory hearts (filled/empty state) with a single subscription. Returns an
 * empty list for an anonymous Visiteur — no session, no Favoris.
 */
export const listMineIds = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return rows.map((row) => row.commerceId);
  },
});

/**
 * « Mis guardados »: the current User's favorite fiches, newest first, projected
 * to the public shape (internal fields stripped). Shows ONLY `publicado` fiches:
 * a favorite whose Commerce is now `suspendido`/`pendiente` (or deleted) is
 * silently dropped — no error, it just disappears from the list. Returns an
 * empty list for an anonymous Visiteur.
 */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const result = [];
    for (const row of rows) {
      const commerce = await ctx.db.get(row.commerceId);
      if (!commerce || commerce.estado !== "publicado") continue;
      result.push(await toPublicCommerce(ctx, commerce));
    }
    return result;
  },
});
