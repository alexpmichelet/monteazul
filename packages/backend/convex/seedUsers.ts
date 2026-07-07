import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { createSeededPasswordAccount } from "./lib/auth/seededAccount";
import type { Role } from "./lib/auth/roles";
import {
  assertValidCommerceForm,
  type CommerceFormInput,
  commerceWriteFields,
} from "./lib/commerce";

/**
 * Development seed — one LOGIN-ABLE test account per stored role.
 *
 * Unlike `seed:seedDev` (which creates Commerce *data owners* with no
 * credentials, only to populate the public listing), this seed creates accounts
 * you can actually SIGN IN with: each gets a Password-provider `authAccounts`
 * credential holding the hashed shared dev password below and a pre-verified
 * email — the same mechanism as the admin "seeded account" onboarding
 * (`lib/auth/seededAccount`), so NO email / OTP is ever sent.
 *
 * All emails use the reserved `@example.com` domain — never real data. Run with:
 *   cd packages/backend && npx convex run seedUsers:seedUsers
 *
 * Idempotent: each run first deletes exactly the three known accounts (by email)
 * with their credentials, sessions, favoris and owned Commerces, then recreates
 * them — so the dev password stays the one documented here on every replay.
 */

/** Shared, well-known DEV password for every seeded test account. */
export const SEED_PASSWORD = "Monteazul2026!";

const ADMIN_EMAIL = "admin@example.com";
const ENTREPRISE_EMAIL = "entreprise@example.com";
const USER_EMAIL = "user@example.com";

const SEED_EMAILS = [ADMIN_EMAIL, ENTREPRISE_EMAIL, USER_EMAIL];

/**
 * A published fiche attached 1:1 to the entreprise test account, so « Mi
 * negocio », edition, suspension and stats are testable right away. Fully
 * invented data.
 */
const ENTREPRISE_COMMERCE: CommerceFormInput = {
  name: "Café Demo Monteazul",
  category: "Comida y bebida",
  subcategories: ["Panadería y repostería"],
  description:
    "Cuenta de demostración para el rol entreprise: café, pan artesanal y repostería. Úsala para probar « Mi negocio », edición, suspensión y estadísticas.",
  whatsapp: "3001112233",
  horario: { mode: "plages", days: "Lun – Sáb", from: 420, to: 1080 },
  torreApto: "Torre 4 · Local 2",
  instagram: "cafe.demo.mz",
  contactName: "Comercio Demo",
  resides: "Resido en Monteazul",
  notas: "Cuenta de prueba — datos inventados.",
};

/**
 * Delete a seed account and everything attached to it (owned Commerces, favoris,
 * auth sessions + their refresh tokens, and the Password credential), so the
 * seed can be replayed without leaving orphans or hitting the unique
 * providerAccountId constraint on re-creation.
 */
async function deleteSeedAccount(
  ctx: MutationCtx,
  email: string,
): Promise<void> {
  const user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  if (!user) return;

  const commerces = await ctx.db
    .query("commerces")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .collect();
  for (const commerce of commerces) {
    await ctx.db.delete(commerce._id);
  }

  const favoris = await ctx.db
    .query("favorites")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  for (const favori of favoris) {
    await ctx.db.delete(favori._id);
  }

  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", user._id))
    .collect();
  for (const session of sessions) {
    const tokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }
    await ctx.db.delete(session._id);
  }

  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
    .collect();
  for (const account of accounts) {
    await ctx.db.delete(account._id);
  }

  await ctx.db.delete(user._id);
}

async function createLoginableUser(
  ctx: MutationCtx,
  args: { email: string; name: string; role: Role },
): Promise<Id<"users">> {
  return createSeededPasswordAccount(ctx, {
    email: args.email,
    name: args.name,
    password: SEED_PASSWORD,
    role: args.role,
  });
}

export const seedUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const email of SEED_EMAILS) {
      await deleteSeedAccount(ctx, email);
    }

    await createLoginableUser(ctx, {
      email: ADMIN_EMAIL,
      name: "Super Admin",
      role: "admin",
    });

    await createLoginableUser(ctx, {
      email: USER_EMAIL,
      name: "Cliente Demo",
      role: "user",
    });

    // Entreprise account + its 1:1 published Commerce.
    assertValidCommerceForm(ENTREPRISE_COMMERCE);
    const entrepriseId = await createLoginableUser(ctx, {
      email: ENTREPRISE_EMAIL,
      name: "Comercio Demo",
      role: "entreprise",
    });
    await ctx.db.insert("commerces", {
      ...commerceWriteFields(ENTREPRISE_COMMERCE),
      photos: [],
      estado: "publicado",
      ownerId: entrepriseId,
    });

    return {
      password: SEED_PASSWORD,
      accounts: [
        { email: ADMIN_EMAIL, role: "admin" as Role },
        { email: ENTREPRISE_EMAIL, role: "entreprise" as Role },
        { email: USER_EMAIL, role: "user" as Role },
      ],
    };
  },
});
