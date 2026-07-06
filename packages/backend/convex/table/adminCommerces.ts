import type { CommerceCategory } from "@packages/shared/categories";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import {
  type EstadoAction,
  estadoAfter,
} from "../lib/approval";
import {
  RESIDES_VALUES,
  type ResidesValue,
  assertValidCommerce,
  categoryValidator,
  commerceSearchText,
  estadoValidator,
  horarioValidator,
} from "../lib/commerce";
import { requireAdmin } from "../rbac";

/**
 * Super admin management of Commerce fiches — the back-office approval queue and
 * "gestión de todas las fichas" (list/filter, edit, approve, suspend, reactivate,
 * remove). Every function is guarded by `requireAdmin` (see `rbac.ts`): the
 * whole surface is reserved to the single administration level `admin`.
 *
 * The Estado transitions are delegated to the pure `approval` state machine, so
 * this module never encodes the allowed transitions itself. Unlike the public
 * projections in `table/commerces.ts`, the admin projection here KEEPS the
 * internal fields (`resides`, `notas`, `estado`, `ownerId`) — those are
 * admin-only and are still never surfaced by the public queries.
 */

/**
 * Admin projection of a Commerce — the full fiche the Super admin needs to
 * moderate it: every public field, the ORDERED photos with their storage id
 * (so the shared photo manager can reorder/delete), the internal fields
 * (`resides`, `notas`), the `estado`, and the owner's contact for context.
 */
async function toAdminCommerce(ctx: QueryCtx, doc: Doc<"commerces">) {
  const photos = await Promise.all(
    doc.photos.map(async (storageId) => ({
      storageId,
      url: await ctx.storage.getUrl(storageId),
    })),
  );
  const owner = await ctx.db.get(doc.ownerId);

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
    ownerId: doc.ownerId,
    ownerEmail: owner?.email,
    ownerName: owner?.name,
  };
}

/**
 * The approval queue: all `pendiente` fiches, OLDEST FIRST, with the internal
 * fields (`resides`, `notas`) the admin needs to qualify a submission. The
 * `by_estado` index is ordered by (`estado`, `_creationTime`), so its default
 * ascending order already yields oldest-first. Admin only.
 */
export const approvalQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pendientes = await ctx.db
      .query("commerces")
      .withIndex("by_estado", (q) => q.eq("estado", "pendiente"))
      .collect();
    return Promise.all(pendientes.map((doc) => toAdminCommerce(ctx, doc)));
  },
});

/**
 * List every fiche, optionally narrowed by `estado` and/or `category`. Picks the
 * narrowest index available (`by_estado` when an estado is given, else
 * `by_category` when a category is given, else a full scan) and applies the
 * remaining filter in memory. Admin only.
 */
export const listCommerces = query({
  args: {
    estado: v.optional(estadoValidator),
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let docs: Doc<"commerces">[];
    if (args.estado !== undefined) {
      const estado = args.estado;
      docs = await ctx.db
        .query("commerces")
        .withIndex("by_estado", (q) => q.eq("estado", estado))
        .collect();
      if (args.category !== undefined) {
        docs = docs.filter((d) => d.category === args.category);
      }
    } else if (args.category !== undefined) {
      const category = args.category;
      docs = await ctx.db
        .query("commerces")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else {
      docs = await ctx.db.query("commerces").collect();
    }

    return Promise.all(docs.map((doc) => toAdminCommerce(ctx, doc)));
  },
});

/**
 * Full admin detail of a single fiche (for the edit screen), or `null` if it no
 * longer exists. Includes the internal fields. Admin only.
 */
export const getCommerceForAdmin = query({
  args: { commerceId: v.id("commerces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(args.commerceId);
    if (!doc) return null;
    return toAdminCommerce(ctx, doc);
  },
});

/**
 * Apply an Estado action to a fiche, delegating the allowed-transition decision
 * to the pure `approval` state machine. A rejected transition surfaces as a
 * Spanish `ConvexError` the back-office renders. Admin only.
 */
async function applyEstadoAction(
  ctx: MutationCtx,
  commerceId: Id<"commerces">,
  action: EstadoAction,
): Promise<void> {
  await requireAdmin(ctx);
  const commerce = await ctx.db.get(commerceId);
  if (!commerce) {
    throw new ConvexError({ message: "Negocio no encontrado." });
  }
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

/** Approve a submission: `pendiente → publicado`. Admin only. */
export const approveCommerce = mutation({
  args: { commerceId: v.id("commerces") },
  handler: (ctx, args) => applyEstadoAction(ctx, args.commerceId, "approve"),
});

/** Suspend a published fiche: `publicado → suspendido` (no re-approval). Admin only. */
export const suspendCommerce = mutation({
  args: { commerceId: v.id("commerces") },
  handler: (ctx, args) => applyEstadoAction(ctx, args.commerceId, "suspend"),
});

/** Reactivate a suspended fiche: `suspendido → publicado` (no re-approval). Admin only. */
export const reactivateCommerce = mutation({
  args: { commerceId: v.id("commerces") },
  handler: (ctx, args) => applyEstadoAction(ctx, args.commerceId, "reactivate"),
});

/**
 * Edit any fiche with the SAME validations as the entrepreneur form
 * (`submitCommerce`): WhatsApp exactly 10 digits, sub-categories only for
 * « Comida y bebida », ¿Resides? among the three values. Recomputes the search
 * haystack and NEVER changes the `estado` (a-posteriori moderation) nor the
 * owner. Photos are managed through the shared owner-or-admin photo mutations.
 * Admin only.
 */
export const updateCommerce = mutation({
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
    await requireAdmin(ctx);

    const commerce = await ctx.db.get(args.commerceId);
    if (!commerce) {
      throw new ConvexError({ message: "Negocio no encontrado." });
    }

    try {
      assertValidCommerce({
        category: args.category,
        subcategories: args.subcategories,
        whatsapp: args.whatsapp,
      });
      if (!RESIDES_VALUES.includes(args.resides as ResidesValue)) {
        throw new Error("El valor de ¿Resides en Monteazul? no es válido.");
      }
    } catch (error) {
      throw new ConvexError({
        message: error instanceof Error ? error.message : "Datos inválidos.",
      });
    }

    const subcategories =
      args.subcategories && args.subcategories.length > 0
        ? args.subcategories
        : undefined;

    // Deliberately does not touch `estado` nor `ownerId`.
    await ctx.db.patch(args.commerceId, {
      name: args.name,
      category: args.category as CommerceCategory,
      subcategories,
      description: args.description,
      whatsapp: args.whatsapp,
      horario: args.horario,
      torreApto: args.torreApto,
      instagram: args.instagram,
      contactName: args.contactName,
      searchText: commerceSearchText({
        name: args.name,
        category: args.category,
        subcategories,
        description: args.description,
      }),
      resides: args.resides as ResidesValue,
      notas: args.notas,
    });
  },
});

/**
 * Definitive removal of a fiche from ANY estado (the UI confirms first). Also
 * deletes the fiche's photo blobs from storage so none linger. Admin only.
 */
export const removeCommerce = mutation({
  args: { commerceId: v.id("commerces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const commerce = await ctx.db.get(args.commerceId);
    if (!commerce) {
      throw new ConvexError({ message: "Negocio no encontrado." });
    }
    for (const storageId of commerce.photos) {
      await ctx.storage.delete(storageId);
    }
    await ctx.db.delete(args.commerceId);
  },
});
