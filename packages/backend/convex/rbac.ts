import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { DEFAULT_ROLE, Role } from "./lib/auth/roles";

/**
 * Role-based access control for the annuaire backend.
 *
 * Every guard follows the same contract (see `rbac.test.ts`): it refuses an
 * anonymous caller ("Visiteur" — no session) and a caller with the wrong role,
 * and returns the caller's `{ userId, user }` for the expected role. The
 * vocabulary follows the domain glossary (`packages/backend/CONTEXT.md`).
 */

export type AuthedUser = { userId: Id<"users">; user: Doc<"users"> };

/**
 * Resolve the authenticated caller, or throw if there is no session.
 */
export async function requireAuthenticated(
  ctx: QueryCtx | MutationCtx
): Promise<AuthedUser> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({ message: "Not authenticated" });
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError({ message: "User not found" });
  }
  return { userId, user };
}

/**
 * Require the caller to hold a specific stored role.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: Role
): Promise<AuthedUser> {
  const authed = await requireAuthenticated(ctx);
  if (authed.user.role !== role) {
    throw new ConvexError({
      message: `Access denied. ${role} role required.`,
    });
  }
  return authed;
}

/** Require the caller to be the Super admin. */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<AuthedUser> {
  return await requireRole(ctx, "admin");
}

/** Require the caller to be an Entrepreneur (role `entreprise`). */
export async function requireEntreprise(
  ctx: QueryCtx | MutationCtx
): Promise<AuthedUser> {
  return await requireRole(ctx, "entreprise");
}

export type OwnedCommerce = {
  userId: Id<"users">;
  commerce: Doc<"commerces">;
};

/**
 * Require the caller to be the owner of a given Commerce.
 *
 * Enforces the ownership rule of the glossary: a Commerce is always attached to
 * exactly one account, and only that owner may read or modify its fiche. Refuses
 * an anonymous caller, an unknown Commerce, and any caller who is not the owner.
 * Returns the caller id and the owned Commerce for the guarded operation.
 */
export async function requireCommerceOwner(
  ctx: QueryCtx | MutationCtx,
  commerceId: Id<"commerces">
): Promise<OwnedCommerce> {
  const { userId } = await requireAuthenticated(ctx);
  const commerce = await ctx.db.get(commerceId);
  if (!commerce) {
    throw new ConvexError({ message: "Negocio no encontrado." });
  }
  if (commerce.ownerId !== userId) {
    throw new ConvexError({ message: "No tienes acceso a este negocio." });
  }
  return { userId, commerce };
}

/**
 * Require the caller to be the owner of a given Commerce, OR the Super admin.
 *
 * Backs the photo mutations, where the glossary rule is « seul le propriétaire
 * (ou un admin) modifie les photos d'une fiche ». Same contract as
 * `requireCommerceOwner` — refuses an anonymous caller and an unknown Commerce —
 * but additionally accepts an `admin` caller on any fiche. Returns the caller id
 * and the target Commerce.
 */
export async function requireCommerceOwnerOrAdmin(
  ctx: QueryCtx | MutationCtx,
  commerceId: Id<"commerces">
): Promise<OwnedCommerce> {
  const { userId, user } = await requireAuthenticated(ctx);
  const commerce = await ctx.db.get(commerceId);
  if (!commerce) {
    throw new ConvexError({ message: "Negocio no encontrado." });
  }
  if (commerce.ownerId !== userId && user.role !== "admin") {
    throw new ConvexError({ message: "No tienes acceso a este negocio." });
  }
  return { userId, commerce };
}

/**
 * Assign the default role (`user`) to a freshly created account.
 *
 * Called from Convex Auth's `afterUserCreatedOrUpdated` callback. Only touches
 * brand-new accounts with no role yet: an existing account signing in again
 * (`existingUserId` set) or an account whose role was already assigned
 * (e.g. `entreprise` at fiche submission, or `admin` via invite) is left
 * untouched.
 */
export async function assignDefaultRole(
  ctx: MutationCtx,
  args: { userId: Id<"users">; existingUserId: Id<"users"> | null }
): Promise<void> {
  if (args.existingUserId !== null) {
    return;
  }
  const user = await ctx.db.get(args.userId);
  if (user && user.role === undefined) {
    await ctx.db.patch(args.userId, { role: DEFAULT_ROLE });
  }
}
