import { COMMERCE_CATEGORIES } from "@packages/shared/categories";
import { defineTable } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  categoryValidator,
  estadoValidator,
  horarioValidator,
  residesValidator,
} from "../lib/commerce";

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
  // Internal, admin-only:
  resides: residesValidator,
  notas: v.optional(v.string()),
  estado: estadoValidator,
  ownerId: v.id("users"),
};

export const commerces = defineTable(documentSchema)
  .index("by_estado", ["estado"])
  .index("by_category", ["category"])
  .index("by_owner", ["ownerId"]);

/** Public projection of a Commerce — strips every internal, admin-only field. */
async function toPublicCommerce(ctx: QueryCtx, doc: Doc<"commerces">) {
  const photos = (
    await Promise.all(doc.photos.map((id) => ctx.storage.getUrl(id)))
  ).filter((url): url is string => url !== null);

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
 * Public annuaire listing: publicado Commerces grouped by category, in the
 * canonical taxonomy order. Never returns `pendiente` nor `suspendido` fiches,
 * and never leaks internal fields.
 */
export const listPublicByCategory = query({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("commerces")
      .withIndex("by_estado", (q) => q.eq("estado", "publicado"))
      .collect();

    const sections = [];
    for (const category of COMMERCE_CATEGORIES) {
      const inCategory = published.filter((doc) => doc.category === category);
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
  },
});
