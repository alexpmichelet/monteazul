import { Scrypt } from "lucia";

/**
 * Secure password hashing for the Convex Auth `Password` provider.
 *
 * The template shipped a `crypto` placeholder whose `hashSecret` returned the
 * secret unchanged, storing passwords in plaintext. This module replaces it
 * with Scrypt from Lucia — the exact primitive Convex Auth's `Password`
 * provider hashes with by default (a pure-JS, salted implementation that runs
 * in the Convex runtime). It is wired into the provider's `crypto` option and
 * exercised by `passwordCrypto.test.ts`.
 */
const scrypt = new Scrypt();

/** Hash a secret with a fresh random salt. Never returns the plaintext. */
export async function hashSecret(secret: string): Promise<string> {
  return await scrypt.hash(secret);
}

/** Constant-time verification of a secret against a stored hash. */
export async function verifySecret(
  secret: string,
  hash: string
): Promise<boolean> {
  return await scrypt.verify(hash, secret);
}
