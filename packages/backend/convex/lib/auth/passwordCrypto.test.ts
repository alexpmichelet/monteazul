import { describe, expect, test } from "vitest";
import { hashSecret, verifySecret } from "./passwordCrypto";

// The template shipped a `crypto` placeholder whose `hashSecret` returned the
// secret unchanged (plaintext storage). These tests pin the security contract:
// stored secrets are hashed, salted, and verifiable — never the plaintext.

describe("password hashing", () => {
  test("never returns the secret in plaintext", async () => {
    const secret = "correct horse battery staple";
    const hash = await hashSecret(secret);
    expect(hash).not.toBe(secret);
    expect(hash).not.toContain(secret);
  });

  test("verifies a matching secret against its hash", async () => {
    const secret = "s3cur3-p@ssw0rd";
    const hash = await hashSecret(secret);
    expect(await verifySecret(secret, hash)).toBe(true);
  });

  test("rejects a non-matching secret", async () => {
    const hash = await hashSecret("the-right-one");
    expect(await verifySecret("the-wrong-one", hash)).toBe(false);
  });

  test("uses a random salt so identical secrets hash differently", async () => {
    const secret = "same-input";
    const first = await hashSecret(secret);
    const second = await hashSecret(secret);
    expect(first).not.toBe(second);
    expect(await verifySecret(secret, first)).toBe(true);
    expect(await verifySecret(secret, second)).toBe(true);
  });
});
