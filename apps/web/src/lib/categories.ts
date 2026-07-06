import {
  CATEGORY_CHIP_TOKENS,
  TODOS_CHIP,
  type CommerceCategory,
} from "@packages/shared/categories";
import {
  HeartPulse,
  House,
  LayoutGrid,
  PawPrint,
  Scissors,
  Shirt,
  Smartphone,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/**
 * Category filter chips for the Monteazul directory.
 *
 * The colour/pastel/short-label tokens are the single source of truth in
 * `@packages/shared` (derived from `docs/product/design.md`); this module only
 * adds what is web-specific: the Lucide icon per chip and the "Todos" filter.
 * Only the seven categories with a documented chip token appear as chips —
 * `Inmuebles y servicios` and `Otro` are valid Commerce categories but, exactly
 * like the prototype, render only as list sections (no coloured filter chip).
 */
export type CategoryKey =
  | "todos"
  | "comida"
  | "mascotas"
  | "belleza"
  | "salud"
  | "ropa"
  | "hogar"
  | "tecnologia";

export type CategoryChip = {
  key: CategoryKey;
  /** Short label rendered under the chip icon (matches the prototype). */
  label: string;
  /** Canonical Spanish Commerce category, or null for the "Todos" filter. */
  category: CommerceCategory | null;
  /** Accent colour used for the active chip and icon. */
  color: string;
  /** Soft pastel used for the resting chip background. */
  pastel: string;
  Icon: LucideIcon;
};

const CHIP_ICONS: {
  key: CategoryKey;
  category: CommerceCategory | null;
  Icon: LucideIcon;
}[] = [
  { key: "todos", category: null, Icon: LayoutGrid },
  { key: "comida", category: "Comida y bebida", Icon: Utensils },
  { key: "mascotas", category: "Mascotas", Icon: PawPrint },
  { key: "belleza", category: "Belleza y cuidado personal", Icon: Scissors },
  { key: "salud", category: "Salud y bienestar", Icon: HeartPulse },
  { key: "ropa", category: "Accesorios y ropa", Icon: Shirt },
  { key: "hogar", category: "Hogar y artesanías", Icon: House },
  { key: "tecnologia", category: "Tecnología", Icon: Smartphone },
];

export const CATEGORY_CHIPS: readonly CategoryChip[] = CHIP_ICONS.map(
  ({ key, category, Icon }) => {
    const token =
      category === null ? TODOS_CHIP : CATEGORY_CHIP_TOKENS[category];
    if (!token) {
      throw new Error(`Missing chip token for category: ${category}`);
    }
    return {
      key,
      category,
      label: token.label,
      color: token.color,
      pastel: token.pastel,
      Icon,
    };
  },
);

export const CATEGORY_CHIP_BY_KEY = Object.fromEntries(
  CATEGORY_CHIPS.map((chip) => [chip.key, chip]),
) as Record<CategoryKey, CategoryChip>;
