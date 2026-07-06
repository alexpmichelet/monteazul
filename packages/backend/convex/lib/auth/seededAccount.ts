import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { hashSecret } from "./passwordCrypto";
import type { Role } from "./roles";

/**
 * Seeded account creation — the WhatsApp onboarding channel for merchants the
 * Super admin recruits (see `docs/product/annuaire-spec.md` §8, "Comptes seedés
 * … credentials transmis manuellement par WhatsApp"). No email is ever sent.
 *
 * The strong password is generated here, returned ONCE to the admin, and only
 * ever persisted hashed (via the same Scrypt `crypto` the Password provider
 * uses), so it can never be re-displayed nor read back in plaintext.
 */

const LOWER = "abcdefghijkmnopqrstuvwxyz"; // no ambiguous l
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no ambiguous I/O
const DIGITS = "23456789"; // no ambiguous 0/1
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

const PASSWORD_LENGTH = 20;

/** Uniform random integer in [0, max) using Web Crypto with rejection sampling. */
function randomInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

/**
 * Generate a strong, cryptographically-random password guaranteed to contain at
 * least one lowercase letter, one uppercase letter, one digit and one symbol,
 * then filled and shuffled from the full alphabet. Excludes visually ambiguous
 * characters so the credential survives a manual WhatsApp hand-off.
 */
export function generateStrongPassword(): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < PASSWORD_LENGTH) {
    chars.push(pick(ALL));
  }
  // Fisher–Yates shuffle so the guaranteed classes are not in fixed positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * Atomically create a Password-provider account for a pre-vetted merchant: the
 * `users` row (with the given stored role and the email marked verified) and the
 * matching `authAccounts` row holding the HASHED secret and `emailVerified` set.
 *
 * `emailVerified` is deliberately set: the Password provider (configured with a
 * `verify` OTP step) otherwise diverts sign-in to email verification for an
 * unverified account — which would both block the login and send an email. A
 * seeded account is vouched for by the admin out-of-band, so it is pre-verified
 * and the merchant can sign in immediately with the generated password.
 *
 * Runs inside the caller's mutation transaction, so it commits all-or-nothing.
 */
export async function createSeededPasswordAccount(
  ctx: MutationCtx,
  args: { email: string; name?: string; password: string; role: Role },
): Promise<Id<"users">> {
  const userId = await ctx.db.insert("users", {
    email: args.email,
    ...(args.name ? { name: args.name } : {}),
    role: args.role,
    emailVerificationTime: Date.now(),
  });
  await ctx.db.insert("authAccounts", {
    userId,
    provider: "password",
    providerAccountId: args.email,
    secret: await hashSecret(args.password),
    emailVerified: args.email,
  });
  return userId;
}
