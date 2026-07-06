import {
  COMIDA_SUBCATEGORIES,
  COMMERCE_CATEGORIES,
  type CommerceCategory,
  isComidaCategory,
} from "@packages/shared/categories";
import { v } from "convex/values";
import type { Horario } from "./horario";

/**
 * Commerce domain enums and validators (see the backend CONTEXT.md glossary).
 * The category / sub-category taxonomy lives in `@packages/shared` and is the
 * single source of truth; here it is turned into Convex validators and runtime
 * guards.
 */

/** Estado lifecycle: pendiente → publicado ⇄ suspendido. */
export const ESTADOS = ["pendiente", "publicado", "suspendido"] as const;
export type Estado = (typeof ESTADOS)[number];

/** ¿Resides en Monteazul? — the three exact Notion values (spec §2). */
export const RESIDES_VALUES = [
  "Resido en Monteazul",
  "Resido cerca de la zona",
  "No resido cerca de la zona",
] as const;
export type ResidesValue = (typeof RESIDES_VALUES)[number];

/** WhatsApp = exactly 10 digits, without +57 nor spaces (spec §2 / §4). */
const WHATSAPP_PATTERN = /^\d{10}$/;

export const categoryValidator = v.union(
  ...COMMERCE_CATEGORIES.map((category) => v.literal(category)),
);

export const estadoValidator = v.union(
  ...ESTADOS.map((estado) => v.literal(estado)),
);

export const residesValidator = v.union(
  ...RESIDES_VALUES.map((value) => v.literal(value)),
);

/** Structured Horario validator — mirrors the `Horario` type in `lib/horario`. */
export const horarioValidator = v.union(
  v.object({
    mode: v.literal("plages"),
    days: v.string(),
    from: v.number(),
    to: v.number(),
  }),
  v.object({
    mode: v.literal("disponible"),
    label: v.string(),
  }),
);

export type ValidatableCommerce = {
  category: string;
  subcategories?: string[];
  whatsapp: string;
};

/**
 * Enforces the Commerce business rules that a Convex schema validator cannot
 * express: sub-categories only for `Comida y bebida`, sub-category values drawn
 * from the shared list, and a strictly 10-digit WhatsApp number. Throws with a
 * Spanish message on the first violation.
 */
export function assertValidCommerce(input: ValidatableCommerce): void {
  if (!COMMERCE_CATEGORIES.includes(input.category as never)) {
    throw new Error(`Categoría desconocida: ${input.category}`);
  }

  const subcategories = input.subcategories ?? [];
  if (subcategories.length > 0) {
    if (!isComidaCategory(input.category)) {
      throw new Error(
        'Las subcategorías solo se permiten en la categoría "Comida y bebida".',
      );
    }
    for (const sub of subcategories) {
      if (!COMIDA_SUBCATEGORIES.includes(sub as never)) {
        throw new Error(`Subcategoría desconocida: ${sub}`);
      }
    }
  }

  if (!WHATSAPP_PATTERN.test(input.whatsapp)) {
    throw new Error(
      "El número de WhatsApp debe tener exactamente 10 dígitos, sin +57 ni espacios.",
    );
  }
}

/**
 * Accent- and case-insensitive normalisation for search: NFD-decompose, strip
 * the combining diacritics, lowercase. « Panadería » → « panaderia », so
 * « panaderia » or « BELLEZA » match regardless of accents or case. Convex has
 * no native accent folding, hence the normalised field maintained below.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type SearchableCommerce = {
  name: string;
  category: string;
  subcategories?: string[];
  description: string;
};

/**
 * The normalised full-text haystack indexed for Commerce search — name,
 * category, sub-categories and description, joined then normalised. It MUST be
 * recomputed on every Commerce write (see `commerces.searchText`) so the search
 * index stays in sync with the document.
 */
export function commerceSearchText(input: SearchableCommerce): string {
  return normalizeForSearch(
    [
      input.name,
      input.category,
      ...(input.subcategories ?? []),
      input.description,
    ].join(" "),
  );
}

/**
 * The fields a fiche form provides — the shared shape of the entrepreneur
 * submission, the entrepreneur edit and the admin edit. Category and resides are
 * plain strings here (validated by `assertValidCommerceForm`) so the back-office
 * can pass the form values as-is.
 */
export type CommerceFormInput = {
  name: string;
  category: string;
  subcategories?: string[];
  description: string;
  whatsapp: string;
  // Optional: the schema stores `horario` as optional. The entrepreneur form
  // always provides one (its Convex arg is required), but the Notion import may
  // leave it unset when the free-text value is not in the correspondence table.
  horario?: Horario;
  torreApto?: string;
  instagram?: string;
  contactName?: string;
  resides: string;
  notas?: string;
};

/**
 * Enforce the shared fiche-form business rules — the ones a Convex schema
 * validator cannot express: WhatsApp exactly 10 digits, sub-categories only for
 * « Comida y bebida », ¿Resides? among the three values. Throws a Spanish
 * `Error` on the first violation; the mutations wrap it in a `ConvexError`.
 * Single source of truth so submission and every edit validate identically.
 */
export function assertValidCommerceForm(input: CommerceFormInput): void {
  assertValidCommerce({
    category: input.category,
    subcategories: input.subcategories,
    whatsapp: input.whatsapp,
  });
  if (!RESIDES_VALUES.includes(input.resides as ResidesValue)) {
    throw new Error("El valor de ¿Resides en Monteazul? no es válido.");
  }
}

/**
 * Build the mutable Commerce document fields written on submission and on every
 * edit — everything EXCEPT `estado`, `ownerId` and `photos` (managed
 * separately). Empty sub-categories collapse to `undefined`, and the search
 * haystack is recomputed here so it can never drift from the stored document.
 * Callers must validate with `assertValidCommerceForm` first.
 */
export function commerceWriteFields(input: CommerceFormInput) {
  const subcategories =
    input.subcategories && input.subcategories.length > 0
      ? input.subcategories
      : undefined;
  return {
    name: input.name,
    category: input.category as CommerceCategory,
    subcategories,
    description: input.description,
    whatsapp: input.whatsapp,
    horario: input.horario,
    torreApto: input.torreApto,
    instagram: input.instagram,
    contactName: input.contactName,
    searchText: commerceSearchText({
      name: input.name,
      category: input.category,
      subcategories,
      description: input.description,
    }),
    resides: input.resides as ResidesValue,
    notas: input.notas,
  };
}
