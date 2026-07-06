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
 * Category design tokens for the Monteazul directory chips.
 *
 * Source of truth: `docs/product/design.md` (colour + pastel per category)
 * and the Claude Design prototype `Directorio Monteazul.dc.html`. Only the
 * categories documented there are modelled here — the design system does not
 * invent tokens for categories without a documented colour.
 *
 * `category` is the canonical Spanish Commerce category (see the backend
 * CONTEXT.md vocabulary); the "Todos" filter chip maps to no category.
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
  category: string | null;
  /** Accent colour used for the active chip and icon. */
  color: string;
  /** Soft pastel used for the resting chip background. */
  pastel: string;
  Icon: LucideIcon;
};

export const CATEGORY_CHIPS: readonly CategoryChip[] = [
  {
    key: "todos",
    label: "Todos",
    category: null,
    color: "#1C2E4A",
    pastel: "#EEF1F6",
    Icon: LayoutGrid,
  },
  {
    key: "comida",
    label: "Comida",
    category: "Comida y bebida",
    color: "#E07B39",
    pastel: "#FBEEE3",
    Icon: Utensils,
  },
  {
    key: "mascotas",
    label: "Mascotas",
    category: "Mascotas",
    color: "#0E9E8E",
    pastel: "#E0F2EF",
    Icon: PawPrint,
  },
  {
    key: "belleza",
    label: "Belleza",
    category: "Belleza y cuidado personal",
    color: "#C85BA0",
    pastel: "#F7E7F1",
    Icon: Scissors,
  },
  {
    key: "salud",
    label: "Salud",
    category: "Salud y bienestar",
    color: "#2E9E5B",
    pastel: "#E4F4EA",
    Icon: HeartPulse,
  },
  {
    key: "ropa",
    label: "Ropa",
    category: "Accesorios y ropa",
    color: "#5B62D6",
    pastel: "#E8E9FB",
    Icon: Shirt,
  },
  {
    key: "hogar",
    label: "Hogar",
    category: "Hogar y artesanías",
    color: "#C2922B",
    pastel: "#F6EEDA",
    Icon: House,
  },
  {
    key: "tecnologia",
    label: "Tecnología",
    category: "Tecnología",
    color: "#3D7FD1",
    pastel: "#E4EEFA",
    Icon: Smartphone,
  },
] as const;

export const CATEGORY_CHIP_BY_KEY = Object.fromEntries(
  CATEGORY_CHIPS.map((chip) => [chip.key, chip]),
) as Record<CategoryKey, CategoryChip>;
