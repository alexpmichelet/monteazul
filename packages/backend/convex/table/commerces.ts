import { getAuthUserId } from "@convex-dev/auth/server";
import {
  COMIDA_CATEGORY,
  COMIDA_SUBCATEGORIES,
  COMMERCE_CATEGORIES,
  type CommerceCategory,
} from "@packages/shared/categories";
import { defineTable } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { type EstadoAction, estadoAfter } from "../lib/approval";
import {
  RESIDES_VALUES,
  assertValidCommerceForm,
  categoryValidator,
  commerceWriteFields,
  estadoValidator,
  horarioValidator,
  normalizeForSearch,
  residesValidator,
} from "../lib/commerce";
import {
  requireAuthenticated,
  requireCommerceOwner,
  requireCommerceOwnerOrAdmin,
} from "../rbac";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
  isAllowedImageType,
} from "../lib/photos";

/**
 * Commerce — the central entity of the directory (see CONTEXT.md). Always owned
 * by exactly one account (`ownerId`). Internal fields (`resides`, `notas`,
 * `estado`, `ownerId`) are admin-only and never surfaced by public queries.
 */
const documentSchema = {
  name: v.string(),
  category: categoryValidator,
  // Sub-categories are only valid for "Comida y bebida" — enforced by
  // `assertValidCommerce` (a schema validator cannot express the dependency).
  subcategories: v.optional(v.array(v.string())),
  description: v.string(),
  whatsapp: v.string(), // 10 digits, no +57
  photos: v.array(v.id("_storage")), // ordered
  horario: v.optional(horarioValidator),
  torreApto: v.optional(v.string()),
  instagram: v.optional(v.string()),
  contactName: v.optional(v.string()),
  // Accent- and case-insensitive full-text haystack (name + category +
  // sub-categories + description), normalised via `commerceSearchText` and
  // recomputed on every write. Backs the `search_text` index — Convex has no
  // native accent folding, so search happens on this normalised field.
  searchText: v.string(),
  // Internal, admin-only:
  resides: residesValidator,
  notas: v.optional(v.string()),
  estado: estadoValidator,
  ownerId: v.id("users"),
};

export const commerces = defineTable(documentSchema)
  .index("by_estado", ["estado"])
  .index("by_category", ["category"])
  .index("by_owner", ["ownerId"])
  .searchIndex("search_text", {
    searchField: "searchText",
    filterFields: ["estado", "category"],
  });

/**
 * Resolve a Commerce's ordered storage photo ids to their public URLs, dropping
 * any that no longer resolve. Shared by every Commerce projection.
 */
async function resolvePhotoUrls(
  ctx: QueryCtx,
  ids: Doc<"commerces">["photos"],
): Promise<string[]> {
  const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  return urls.filter((url): url is string => url !== null);
}

/**
 * Resolve a fiche's ordered photos while KEEPING their storage id — the shape
 * the owner's photo manager needs to reorder and delete by id (the public
 * projection only exposes URLs). Preserves order and every entry, so the
 * reorder set stays complete even if a blob momentarily fails to resolve.
 */
async function resolveOwnerPhotos(
  ctx: QueryCtx,
  ids: Doc<"commerces">["photos"],
): Promise<{ storageId: Doc<"commerces">["photos"][number]; url: string | null }[]> {
  return await Promise.all(
    ids.map(async (storageId) => ({
      storageId,
      url: await ctx.storage.getUrl(storageId),
    })),
  );
}

/**
 * Public projection of a Commerce — strips every internal, admin-only field.
 * Exported so other public surfaces (e.g. « Mis guardados » in `favorites`)
 * expose the exact same internal-fields-stripped shape.
 */
export async function toPublicCommerce(ctx: QueryCtx, doc: Doc<"commerces">) {
  const photos = await resolvePhotoUrls(ctx, doc.photos);

  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    name: doc.name,
    category: doc.category,
    subcategories: doc.subcategories,
    description: doc.description,
    whatsapp: doc.whatsapp,
    photos,
    horario: doc.horario,
    torreApto: doc.torreApto,
    instagram: doc.instagram,
    contactName: doc.contactName,
  };
}

/**
 * Fetch the `publicado` Commerces matching an optional accent-insensitive
 * search query and/or category, picking the narrowest index available:
 *
 * - With a search query: the `search_text` index over the normalised field
 *   (accent- and case-insensitive, matching name / category / sub-category /
 *   description words), filtered to `publicado` (+ category when set).
 * - Category only: the `by_category` index, filtered to `publicado`.
 * - Neither: the `by_estado` index.
 */
async function fetchPublished(
  ctx: QueryCtx,
  opts: { text?: string; category?: CommerceCategory },
): Promise<Doc<"commerces">[]> {
  const normalized = normalizeForSearch(opts.text ?? "").trim();
  const category = opts.category ?? null;

  if (normalized.length > 0) {
    return ctx.db
      .query("commerces")
      .withSearchIndex("search_text", (q) => {
        const search = q
          .search("searchText", normalized)
          .eq("estado", "publicado");
        return category ? search.eq("category", category) : search;
      })
      .collect();
  }
  if (category) {
    return ctx.db
      .query("commerces")
      .withIndex("by_category", (q) => q.eq("category", category))
      .filter((q) => q.eq(q.field("estado"), "publicado"))
      .collect();
  }
  return ctx.db
    .query("commerces")
    .withIndex("by_estado", (q) => q.eq("estado", "publicado"))
    .collect();
}

/**
 * Project the given Commerces to their public shape and group them by category
 * in the canonical taxonomy order, dropping empty categories. Shared by the
 * plain listing and the search query so both expose the exact same
 * internal-fields-stripped, canonically-ordered sections.
 */
async function groupByCategory(ctx: QueryCtx, docs: Doc<"commerces">[]) {
  const sections = [];
  for (const category of COMMERCE_CATEGORIES) {
    const inCategory = docs.filter((doc) => doc.category === category);
    if (inCategory.length === 0) continue;
    const commercesInCategory = await Promise.all(
      inCategory.map((doc) => toPublicCommerce(ctx, doc)),
    );
    sections.push({
      category,
      count: commercesInCategory.length,
      commerces: commercesInCategory,
    });
  }
  return sections;
}

/** Fetch + group the public sections for an optional query and/or category. */
async function collectPublicSections(
  ctx: QueryCtx,
  opts: { text?: string; category?: CommerceCategory },
) {
  return groupByCategory(ctx, await fetchPublished(ctx, opts));
}

/**
 * Public annuaire listing: publicado Commerces grouped by category, in the
 * canonical taxonomy order. Never returns `pendiente` nor `suspendido` fiches,
 * and never leaks internal fields.
 */
export const listPublicByCategory = query({
  args: {},
  handler: (ctx) => collectPublicSections(ctx, {}),
});

/**
 * Public annuaire search: same grouped, publicado-only projection as
 * `listPublicByCategory`, narrowed by an accent- and case-insensitive text
 * query and/or the active category chip. Both filters combine.
 */
export const searchPublic = query({
  args: {
    text: v.optional(v.string()),
    category: v.optional(categoryValidator),
  },
  handler: (ctx, args) =>
    collectPublicSections(ctx, { text: args.text, category: args.category }),
});

/**
 * Public detail of a single Commerce, backing the fiche screen. Returns the
 * internal-fields-stripped projection ONLY when the fiche is `publicado`; a
 * `pendiente`/`suspendido` fiche, an unknown id, or a malformed id string all
 * return `null` so the web app renders its "no encontrado" page. Accepts a raw
 * string id (the URL param) and normalises it, so a deep link with garbage in
 * the path degrades gracefully instead of throwing. Never leaks the internal
 * fields (`resides`, `notas`, `estado`, `ownerId`).
 */
export const getPublicById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("commerces", args.id);
    if (!id) return null;
    const doc = await ctx.db.get(id);
    if (!doc || doc.estado !== "publicado") return null;
    return toPublicCommerce(ctx, doc);
  },
});

/**
 * Owner projection of a Commerce — the fiche as its Entrepreneur sees it in
 * « Mi negocio », including the `estado` (e.g. `pendiente` = pending approval)
 * and the internal fields the owner themselves submitted (`resides`, `notas`).
 * Only ever returned to the owner (see `myCommerce`), never to the public.
 */
export async function toOwnerCommerce(ctx: QueryCtx, doc: Doc<"commerces">) {
  const photos = await resolveOwnerPhotos(ctx, doc.photos);

  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    name: doc.name,
    category: doc.category,
    subcategories: doc.subcategories,
    description: doc.description,
    whatsapp: doc.whatsapp,
    photos,
    horario: doc.horario,
    torreApto: doc.torreApto,
    instagram: doc.instagram,
    contactName: doc.contactName,
    resides: doc.resides,
    notas: doc.notas,
    estado: doc.estado,
  };
}

/**
 * The « Mi negocio » query: the caller's own fiche (with its `estado`) or
 * `null`. Scoped to the caller through the `by_owner` index, so it is an
 * ownership guard by construction — a caller can only ever obtain their own
 * fiche, never another account's, and an anonymous caller gets `null`.
 */
export const myCommerce = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const doc = await ctx.db
      .query("commerces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (!doc) return null;
    return toOwnerCommerce(ctx, doc);
  },
});

/**
 * Taxonomy + enum values backing the entrepreneur fiche form. Surfaced from the
 * shared constants (`@packages/shared`) and the domain enums so the back-office
 * form builds its selects from the single source of truth, without duplicating
 * the Spanish labels client-side.
 */
export const getFormOptions = query({
  args: {},
  handler: () => ({
    categories: COMMERCE_CATEGORIES,
    comidaCategory: COMIDA_CATEGORY,
    comidaSubcategories: COMIDA_SUBCATEGORIES,
    residesValues: RESIDES_VALUES,
  }),
});

/**
 * Submit the caller's fiche (back-office entrepreneur onboarding).
 *
 * Creates the Commerce in `pendiente` (invisible to the public until a Super
 * admin approves it) and grants the `entreprise` role to the account at
 * submission — approval only publishes (see CONTEXT.md). Enforces the 1:1 rule
 * (one account owns exactly one Commerce: a second submission is refused) and
 * the business-rule validation (WhatsApp exactly 10 digits, sub-categories only
 * for « Comida y bebida », ¿Resides? among the three values), surfacing a
 * Spanish `ConvexError` message the form renders inline.
 *
 * `category` and `resides` are accepted as plain strings and validated here (so
 * the back-office passes the form values as-is); once validated they match the
 * strict schema validators on insert.
 */
export const submitCommerce = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    subcategories: v.optional(v.array(v.string())),
    description: v.string(),
    whatsapp: v.string(),
    horario: horarioValidator,
    torreApto: v.optional(v.string()),
    instagram: v.optional(v.string()),
    contactName: v.optional(v.string()),
    resides: v.string(),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuthenticated(ctx);

    // 1:1 strict — an account owns exactly one Commerce.
    const existing = await ctx.db
      .query("commerces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (existing) {
      throw new ConvexError({
        message:
          "Ya tienes un negocio registrado. Cada cuenta gestiona un solo negocio.",
      });
    }

    // Business rules a schema validator cannot express — surfaced in Spanish.
    try {
      assertValidCommerceForm(args);
    } catch (error) {
      throw new ConvexError({
        message: error instanceof Error ? error.message : "Datos inválidos.",
      });
    }

    const commerceId = await ctx.db.insert("commerces", {
      ...commerceWriteFields(args),
      photos: [],
      estado: "pendiente",
      ownerId: userId,
    });

    // Grant the `entreprise` role at submission. Never downgrade a Super admin
    // who happens to submit a fiche.
    if (user.role !== "admin") {
      await ctx.db.patch(userId, { role: "entreprise" });
    }

    return commerceId;
  },
});

/**
 * Edit the caller's OWN fiche from « Mi negocio », with the SAME validations as
 * the submission (`submitCommerce`): WhatsApp exactly 10 digits, sub-categories
 * only for « Comida y bebida », ¿Resides? among the three values. Recomputes the
 * search haystack. Guarded by `requireCommerceOwner`, so only the owner may edit
 * — never another account (a non-owner is refused).
 *
 * Crucially, it NEVER changes the `estado` nor the `ownerId`: editing a
 * `publicado` fiche keeps it online with the changes (moderación a posteriori),
 * it does not send it back to approval.
 */
export const updateMyCommerce = mutation({
  args: {
    commerceId: v.id("commerces"),
    name: v.string(),
    category: v.string(),
    subcategories: v.optional(v.array(v.string())),
    description: v.string(),
    whatsapp: v.string(),
    horario: horarioValidator,
    torreApto: v.optional(v.string()),
    instagram: v.optional(v.string()),
    contactName: v.optional(v.string()),
    resides: v.string(),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCommerceOwner(ctx, args.commerceId);

    // Same business rules as submission — surfaced in Spanish.
    try {
      assertValidCommerceForm(args);
    } catch (error) {
      throw new ConvexError({
        message: error instanceof Error ? error.message : "Datos inválidos.",
      });
    }

    // Deliberately does not touch `estado` nor `ownerId`.
    await ctx.db.patch(args.commerceId, commerceWriteFields(args));
  },
});

/**
 * Drive one of the owner's reversible Estado transitions on their OWN fiche,
 * delegating the allowed-transition decision to the shared `approval` state
 * machine (never re-encoding it here). Owner-guarded via `requireCommerceOwner`,
 * so a non-owner is refused. A rejected transition surfaces as a Spanish
 * `ConvexError` the back-office renders.
 */
async function applyOwnerEstadoAction(
  ctx: MutationCtx,
  commerceId: Id<"commerces">,
  action: EstadoAction,
): Promise<void> {
  const { commerce } = await requireCommerceOwner(ctx, commerceId);
  let estado;
  try {
    estado = estadoAfter(commerce.estado, action);
  } catch (error) {
    throw new ConvexError({
      message:
        error instanceof Error ? error.message : "Transición no permitida.",
    });
  }
  await ctx.db.patch(commerceId, { estado });
}

/**
 * « Suspender mi publicación »: `publicado → suspendido`. The fiche disappears
 * from the public annuaire at once. Owner only.
 */
export const suspendMyCommerce = mutation({
  args: { commerceId: v.id("commerces") },
  handler: (ctx, args) =>
    applyOwnerEstadoAction(ctx, args.commerceId, "suspend"),
});

/**
 * « Reactivar mi publicación »: `suspendido → publicado`, back online WITHOUT
 * any admin re-approval. Owner only.
 */
export const reactivateMyCommerce = mutation({
  args: { commerceId: v.id("commerces") },
  handler: (ctx, args) =>
    applyOwnerEstadoAction(ctx, args.commerceId, "reactivate"),
});

// ===========================================================================
// Photos — the Entrepreneur's fiche vitrine (upload / order / delete).
//
// Every mutation is guarded by `requireCommerceOwnerOrAdmin`, enforcing the
// glossary rule « seul le propriétaire (ou un admin) modifie les photos d'une
// fiche ». The `photos` array is an ORDERED list of Convex storage ids: its
// order is the order rendered by the public carousel, and its first element is
// the card visual (see `apps/web`). Photos never feed the search haystack, so
// they never touch `searchText`.
// ===========================================================================

/**
 * Owner-guarded upload URL for a fiche photo. Mirrors `storage.generateUploadUrl`
 * but refuses anyone who is not the Commerce owner (or a Super admin), so upload
 * tokens are only ever minted for a fiche the caller may edit. The back-office
 * POSTs the (client-compressed) image to this URL, then calls `addPhoto` with
 * the returned storage id.
 */
export const generatePhotoUploadUrl = mutation({
  args: { commerceId: v.id("commerces") },
  handler: async (ctx, args) => {
    await requireCommerceOwnerOrAdmin(ctx, args.commerceId);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Attach an uploaded image to a fiche, appended at the end of the ordered
 * `photos` list. Validates the stored blob before attaching: it must be an
 * image and must not exceed the size cap (`MAX_PHOTO_BYTES`). The authoritative
 * content type recorded by Convex storage wins, falling back to the
 * client-declared `contentType` when storage did not record one.
 *
 * A rejected blob is deleted so no orphan lingers in storage — which is why a
 * validation failure returns `{ ok: false, error }` rather than throwing: a
 * thrown mutation rolls back its whole transaction, including the cleanup
 * delete, whereas a returned result commits it. The back-office surfaces
 * `error` as a toast. Ownership violations still throw (not a user-input error).
 */
export const addPhoto = mutation({
  args: {
    commerceId: v.id("commerces"),
    storageId: v.id("_storage"),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const { commerce } = await requireCommerceOwnerOrAdmin(
      ctx,
      args.commerceId,
    );

    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      return { ok: false as const, error: "No se encontró el archivo subido." };
    }

    const contentType = metadata.contentType ?? args.contentType;
    if (!isAllowedImageType(contentType)) {
      await ctx.storage.delete(args.storageId);
      return { ok: false as const, error: "Solo se permiten imágenes." };
    }
    if (metadata.size > MAX_PHOTO_BYTES) {
      await ctx.storage.delete(args.storageId);
      return {
        ok: false as const,
        error: `La imagen supera el tamaño máximo de ${MAX_PHOTO_MB} MB.`,
      };
    }

    await ctx.db.patch(args.commerceId, {
      photos: [...commerce.photos, args.storageId],
    });
    return { ok: true as const, storageId: args.storageId };
  },
});

/**
 * Persist a new photo order for a fiche (back-office drag-and-drop). The given
 * `photoIds` MUST be a permutation of the fiche's current photos — same members,
 * no addition, removal nor duplicate — so reordering can never smuggle in an
 * unvalidated blob nor drop one. Ownership-guarded.
 */
export const reorderPhotos = mutation({
  args: {
    commerceId: v.id("commerces"),
    photoIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { commerce } = await requireCommerceOwnerOrAdmin(
      ctx,
      args.commerceId,
    );

    const current = commerce.photos as string[];
    const next = args.photoIds as string[];
    const currentSet = new Set(current);
    const nextSet = new Set(next);
    const isPermutation =
      current.length === next.length &&
      nextSet.size === next.length &&
      next.every((id) => currentSet.has(id));
    if (!isPermutation) {
      throw new ConvexError({
        message: "El nuevo orden de fotos no es válido.",
      });
    }

    await ctx.db.patch(args.commerceId, { photos: args.photoIds });
  },
});

/**
 * Detach a photo from a fiche and delete its blob from storage. The photo must
 * belong to the fiche. Ownership-guarded.
 */
export const removePhoto = mutation({
  args: {
    commerceId: v.id("commerces"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { commerce } = await requireCommerceOwnerOrAdmin(
      ctx,
      args.commerceId,
    );

    if (!commerce.photos.some((id) => id === args.storageId)) {
      throw new ConvexError({
        message: "La foto no pertenece a este negocio.",
      });
    }

    await ctx.db.patch(args.commerceId, {
      photos: commerce.photos.filter((id) => id !== args.storageId),
    });
    await ctx.storage.delete(args.storageId);
  },
});
