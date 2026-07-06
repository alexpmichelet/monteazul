import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import { MAX_PHOTO_BYTES } from "./lib/photos";
import schema from "./schema";

// Provide glob explicitly so convex-test can locate _generated/ and all modules.
const modules = import.meta.glob("./**/*.*s");

type Role = "user" | "entreprise" | "admin";

async function makeUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: Role,
): Promise<Id<"users">> {
  return await t.run((ctx) => ctx.db.insert("users", { email, role }));
}

/** Insert a fiche owned by `ownerId`, starting with no photo. */
async function makeCommerce(
  t: ReturnType<typeof convexTest>,
  ownerId: Id<"users">,
): Promise<Id<"commerces">> {
  const base = {
    name: "Panadería El Sol",
    category: "Comida y bebida",
    subcategories: ["Panadería y repostería"],
    description: "Pan artesanal horneado a diario.",
  };
  return await t.run((ctx) =>
    ctx.db.insert("commerces", {
      ...base,
      searchText: commerceSearchText(base),
      whatsapp: "3182173887",
      photos: [],
      horario: { mode: "plages", days: "Lun – Vie", from: 450, to: 960 },
      torreApto: "Torre 4 · Apto 926",
      resides: "Resido en Monteazul",
      estado: "pendiente",
      ownerId,
    }),
  );
}

/** Store a blob in Convex storage and return its id (defaults: 1 KB image). */
async function storeImage(
  t: ReturnType<typeof convexTest>,
  opts?: { type?: string; bytes?: number },
): Promise<Id<"_storage">> {
  const type = opts?.type ?? "image/jpeg";
  const bytes = opts?.bytes ?? 1024;
  return await t.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })),
  );
}

/** Read back the raw (ordered storage id) photos array of a fiche. */
async function photosOf(
  t: ReturnType<typeof convexTest>,
  commerceId: Id<"commerces">,
): Promise<Id<"_storage">[]> {
  const doc = await t.run((ctx) => ctx.db.get(commerceId));
  return doc!.photos;
}

describe("addPhoto — upload et ordre", () => {
  test("attache une photo et la persiste sur la fiche", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const storageId = await storeImage(t, { type: "image/png" });

    const result = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "image/png",
      });

    expect(result).toEqual({ ok: true, storageId });
    expect(await photosOf(t, commerceId)).toEqual([storageId]);
  });

  test("conserve l'ordre de téléversement sur plusieurs ajouts", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const asOwner = t.withIdentity({ subject: ownerId });

    const first = await storeImage(t);
    const second = await storeImage(t);
    const third = await storeImage(t);
    for (const storageId of [first, second, third]) {
      await asOwner.mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "image/jpeg",
      });
    }

    expect(await photosOf(t, commerceId)).toEqual([first, second, third]);
  });

  test("refuse un fichier non-image et ne l'attache pas (blob nettoyé)", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const storageId = await storeImage(t, { type: "application/pdf" });

    const result = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "application/pdf",
      });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/imág|imagen/i);
    expect(await photosOf(t, commerceId)).toEqual([]);
    // The rejected blob is removed from storage (no orphan).
    const url = await t.run((ctx) => ctx.storage.getUrl(storageId));
    expect(url).toBeNull();
  });

  test("refuse un fichier trop lourd et ne l'attache pas", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const storageId = await storeImage(t, {
      type: "image/jpeg",
      bytes: MAX_PHOTO_BYTES + 1,
    });

    const result = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "image/jpeg",
      });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tamaño|máximo|MB/i);
    expect(await photosOf(t, commerceId)).toEqual([]);
    const url = await t.run((ctx) => ctx.storage.getUrl(storageId));
    expect(url).toBeNull();
  });
});

describe("addPhoto — garde d'ownership", () => {
  test("refuse un compte qui n'est pas le propriétaire", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const otherId = await makeUser(t, "other@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const storageId = await storeImage(t);

    await expect(
      t.withIdentity({ subject: otherId }).mutation(
        api.table.commerces.addPhoto,
        { commerceId, storageId, contentType: "image/jpeg" },
      ),
    ).rejects.toThrow();
    expect(await photosOf(t, commerceId)).toEqual([]);
  });

  test("refuse un appelant anonyme (Visiteur)", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const storageId = await storeImage(t);

    await expect(
      t.mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "image/jpeg",
      }),
    ).rejects.toThrow();
  });

  test("autorise un Super admin sur la fiche d'un autre", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const adminId = await makeUser(t, "admin@example.com", "admin");
    const commerceId = await makeCommerce(t, ownerId);
    const storageId = await storeImage(t);

    await t
      .withIdentity({ subject: adminId })
      .mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "image/jpeg",
      });

    expect(await photosOf(t, commerceId)).toEqual([storageId]);
  });
});

describe("reorderPhotos — ordre persisté", () => {
  async function seedThreePhotos(t: ReturnType<typeof convexTest>) {
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const asOwner = t.withIdentity({ subject: ownerId });
    const ids: Id<"_storage">[] = [];
    for (let i = 0; i < 3; i++) {
      const storageId = await storeImage(t);
      await asOwner.mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "image/jpeg",
      });
      ids.push(storageId);
    }
    return { ownerId, commerceId, ids };
  }

  test("réordonne les photos et persiste le nouvel ordre", async () => {
    const t = convexTest(schema, modules);
    const { ownerId, commerceId, ids } = await seedThreePhotos(t);
    const reordered = [ids[2], ids[0], ids[1]];

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.reorderPhotos, {
        commerceId,
        photoIds: reordered,
      });

    expect(await photosOf(t, commerceId)).toEqual(reordered);
  });

  test("refuse un ordre qui n'est pas une permutation des photos actuelles", async () => {
    const t = convexTest(schema, modules);
    const { ownerId, commerceId, ids } = await seedThreePhotos(t);
    const foreign = await storeImage(t);

    await expect(
      t.withIdentity({ subject: ownerId }).mutation(
        api.table.commerces.reorderPhotos,
        { commerceId, photoIds: [ids[0], ids[1], foreign] },
      ),
    ).rejects.toThrow();
    // Order unchanged after the rejected reorder.
    expect(await photosOf(t, commerceId)).toEqual(ids);
  });

  test("refuse un non-propriétaire", async () => {
    const t = convexTest(schema, modules);
    const { commerceId, ids } = await seedThreePhotos(t);
    const otherId = await makeUser(t, "other@example.com", "entreprise");

    await expect(
      t.withIdentity({ subject: otherId }).mutation(
        api.table.commerces.reorderPhotos,
        { commerceId, photoIds: [ids[2], ids[1], ids[0]] },
      ),
    ).rejects.toThrow();
  });
});

describe("removePhoto — suppression persistée", () => {
  async function seedTwoPhotos(t: ReturnType<typeof convexTest>) {
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);
    const asOwner = t.withIdentity({ subject: ownerId });
    const first = await storeImage(t);
    const second = await storeImage(t);
    for (const storageId of [first, second]) {
      await asOwner.mutation(api.table.commerces.addPhoto, {
        commerceId,
        storageId,
        contentType: "image/jpeg",
      });
    }
    return { ownerId, commerceId, first, second };
  }

  test("retire la photo de la fiche et supprime le blob", async () => {
    const t = convexTest(schema, modules);
    const { ownerId, commerceId, first, second } = await seedTwoPhotos(t);

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.removePhoto, {
        commerceId,
        storageId: first,
      });

    expect(await photosOf(t, commerceId)).toEqual([second]);
    const url = await t.run((ctx) => ctx.storage.getUrl(first));
    expect(url).toBeNull();
  });

  test("refuse de retirer une photo qui n'appartient pas à la fiche", async () => {
    const t = convexTest(schema, modules);
    const { ownerId, commerceId } = await seedTwoPhotos(t);
    const foreign = await storeImage(t);

    await expect(
      t.withIdentity({ subject: ownerId }).mutation(
        api.table.commerces.removePhoto,
        { commerceId, storageId: foreign },
      ),
    ).rejects.toThrow();
  });

  test("refuse un non-propriétaire", async () => {
    const t = convexTest(schema, modules);
    const { commerceId, first } = await seedTwoPhotos(t);
    const otherId = await makeUser(t, "other@example.com", "entreprise");

    await expect(
      t.withIdentity({ subject: otherId }).mutation(
        api.table.commerces.removePhoto,
        { commerceId, storageId: first },
      ),
    ).rejects.toThrow();
  });
});

describe("generatePhotoUploadUrl — garde d'ownership", () => {
  test("retourne une URL d'upload pour le propriétaire", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);

    const url = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.commerces.generatePhotoUploadUrl, { commerceId });
    expect(typeof url).toBe("string");
  });

  test("refuse un non-propriétaire", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const otherId = await makeUser(t, "other@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);

    await expect(
      t.withIdentity({ subject: otherId }).mutation(
        api.table.commerces.generatePhotoUploadUrl,
        { commerceId },
      ),
    ).rejects.toThrow();
  });

  test("refuse un appelant anonyme", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await makeUser(t, "owner@example.com", "entreprise");
    const commerceId = await makeCommerce(t, ownerId);

    await expect(
      t.mutation(api.table.commerces.generatePhotoUploadUrl, { commerceId }),
    ).rejects.toThrow();
  });
});
