import { v } from "convex/values";

/**
 * The roles stored in the database, per the domain glossary
 * (`packages/backend/CONTEXT.md`): a single validator reused everywhere the
 * role union appears (users table, admin validators, guards, sign-up callback)
 * so the union can never drift between call sites.
 *
 * - `user`       — a client browsing the annuaire who can save Favoris.
 * - `entreprise` — an Entrepreneur owning exactly one Commerce.
 * - `admin`      — the Super admin (single administration level).
 *
 * "Visiteur" (anonymous) is the absence of a session, never a stored value.
 */
export const ROLES = ["user", "entreprise", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const roleValidator = v.union(
  v.literal("user"),
  v.literal("entreprise"),
  v.literal("admin")
);

/** Role granted to every account at sign-up. */
export const DEFAULT_ROLE: Role = "user";
