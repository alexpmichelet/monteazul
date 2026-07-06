// @ts-check
/**
 * Canonical Commerce taxonomy for the Monteazul directory — the single source
 * of truth shared by the Convex backend (schema validation, seed) and the web
 * app (filter chips, section grouping).
 *
 * Category and sub-category labels are the EXACT Spanish values of the Notion
 * base, per `docs/product/annuaire-spec.md` §3. Chip colours/pastels/short
 * labels come from `docs/product/design.md` (and the Claude Design prototype).
 *
 * Note — only seven categories carry a chip design token: those are the ones
 * documented in `docs/product/design.md` and rendered as filter chips in the
 * prototype (`Directorio Monteazul.dc.html`, whose colour map has exactly
 * Todos + 7 entries). `Inmuebles y servicios` and `Otro` are valid Commerce
 * categories but have no documented colour, so — faithfully to the prototype —
 * they appear only as list sections, never as coloured filter chips. Inventing
 * colours for them is out of scope (no undocumented product specs).
 */

/** The nine canonical Commerce categories, in display order. */
export const COMMERCE_CATEGORIES = [
  "Comida y bebida",
  "Mascotas",
  "Belleza y cuidado personal",
  "Salud y bienestar",
  "Accesorios y ropa",
  "Hogar y artesanías",
  "Tecnología",
  "Inmuebles y servicios",
  "Otro",
];

/** The only category that may carry sub-categories. */
export const COMIDA_CATEGORY = "Comida y bebida";

/** The seven `Comida y bebida` sub-categories (multi-select), in order. */
export const COMIDA_SUBCATEGORIES = [
  "Almuerzos y comida típica",
  "Panadería y repostería",
  "Carnes y embutidos",
  "Frutas y mercado",
  "Snacks y saludables",
  "Helados y postres",
  "Otros",
];

/** Chip design token for the "Todos" filter (not a Commerce category). */
export const TODOS_CHIP = {
  label: "Todos",
  color: "#1C2E4A",
  pastel: "#EEF1F6",
};

/**
 * Chip design tokens per Commerce category, keyed by the exact category value.
 * Only the seven categories documented in `docs/product/design.md` are present.
 */
export const CATEGORY_CHIP_TOKENS = {
  "Comida y bebida": { label: "Comida", color: "#E07B39", pastel: "#FBEEE3" },
  Mascotas: { label: "Mascotas", color: "#0E9E8E", pastel: "#E0F2EF" },
  "Belleza y cuidado personal": {
    label: "Belleza",
    color: "#C85BA0",
    pastel: "#F7E7F1",
  },
  "Salud y bienestar": { label: "Salud", color: "#2E9E5B", pastel: "#E4F4EA" },
  "Accesorios y ropa": { label: "Ropa", color: "#5B62D6", pastel: "#E8E9FB" },
  "Hogar y artesanías": { label: "Hogar", color: "#C2922B", pastel: "#F6EEDA" },
  Tecnología: { label: "Tecnología", color: "#3D7FD1", pastel: "#E4EEFA" },
};

/** True when the category may carry `Comida y bebida` sub-categories. */
export function isComidaCategory(category) {
  return category === COMIDA_CATEGORY;
}
