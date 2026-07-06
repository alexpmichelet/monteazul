/**
 * Type declarations for `categories.js` — the shared Commerce taxonomy.
 * Hand-written so TypeScript consumers (Convex backend, web app) get the exact
 * Spanish literal unions instead of loose `string`s.
 */

export type CommerceCategory =
  | "Comida y bebida"
  | "Mascotas"
  | "Belleza y cuidado personal"
  | "Salud y bienestar"
  | "Accesorios y ropa"
  | "Hogar y artesanías"
  | "Tecnología"
  | "Inmuebles y servicios"
  | "Otro";

export type ComidaSubcategory =
  | "Almuerzos y comida típica"
  | "Panadería y repostería"
  | "Carnes y embutidos"
  | "Frutas y mercado"
  | "Snacks y saludables"
  | "Helados y postres"
  | "Otros";

export type CategoryChipToken = {
  label: string;
  color: string;
  pastel: string;
};

export const COMMERCE_CATEGORIES: readonly CommerceCategory[];
export const COMIDA_CATEGORY: "Comida y bebida";
export const COMIDA_SUBCATEGORIES: readonly ComidaSubcategory[];
export const TODOS_CHIP: CategoryChipToken;
export const CATEGORY_CHIP_TOKENS: Readonly<
  Partial<Record<CommerceCategory, CategoryChipToken>>
>;
export function isComidaCategory(category: string): boolean;
