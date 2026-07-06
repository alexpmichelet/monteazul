/**
 * Notion import planning — the pure, write-free heart of the one-shot import
 * (PRD #1 §"Import initial", `docs/product/notion-csv-format.md`). Turns parsed
 * Notion rows plus a manually-prepared Horario correspondence table into:
 *  - an {@link ImportReport} the operator reads BEFORE anything is written, and
 *  - the list of normalized {@link NormalizedFiche} ready to be created.
 *
 * No Convex imports: fully unit-testable and reused verbatim by the import
 * mutation (the authoritative guard) and by the operator's CLI pre-check, so
 * the dry-run and the real run can never disagree.
 *
 * Failure policy:
 *  - Duplicate `Correo` → HARD abort (`report.ok === false`, zero fiches). The
 *    operator de-duplicates the CSV and re-runs (PRD).
 *  - A row without `Correo` → ignored and listed (cannot seed an account).
 *  - A per-row validation failure (WhatsApp, ¿Resides?, Categoría) → the row is
 *    flagged and skipped, but the rest of the import still proceeds.
 *  - Unmapped free-text `Horario` → the fiche is imported WITHOUT a horario and
 *    flagged, so the operator can complete the correspondence table.
 *  - Unknown/empty `Estado` → defaults to `pendiente` (invisible to the public,
 *    the safe state) and is flagged.
 */

import {
  COMIDA_SUBCATEGORIES,
  COMMERCE_CATEGORIES,
  isComidaCategory,
} from "@packages/shared/categories";
import {
  type CommerceFormInput,
  type Estado,
  RESIDES_VALUES,
  type ResidesValue,
} from "../commerce";
import type { Horario } from "../horario";
import type { NotionRow } from "./csv";

/** A manually-prepared correspondence: free-text Horario → structured Horario. */
export type HorarioMapping = { raw: string; horario: Horario };

/** A per-row diagnostic entry (references the CSV line + the row's Correo). */
export type RowIssue = { line: number; correo: string; raw: string };

/** The pre-write report the operator inspects before committing an import. */
export type ImportReport = {
  /** False iff duplicate Correos were found — the only case that aborts. */
  ok: boolean;
  totalRows: number;
  /** Rows that would be written (accounts + fiches created). */
  importable: number;
  /** Correos appearing more than once (case-insensitive) → abort, zero writes. */
  duplicateCorreos: string[];
  /** Rows ignored because they carry no Correo. */
  rowsWithoutCorreo: { line: number; name: string }[];
  /** Rows skipped: WhatsApp could not be normalized to 10 digits. */
  invalidWhatsapp: RowIssue[];
  /** Rows skipped: ¿Resides en Monteazul? outside the three allowed values. */
  invalidResides: RowIssue[];
  /** Rows skipped: Categoría not in the shared taxonomy. */
  unknownCategory: RowIssue[];
  /** Rows imported anyway, but with sub-categories dropped (not Comida y bebida). */
  droppedSubcategories: { line: number; correo: string }[];
  /** Rows imported anyway, but without a Horario (free text not in the table). */
  unmappedHorario: RowIssue[];
  /** Rows imported with Estado defaulted to `pendiente` (value unknown/empty). */
  unmappedEstado: RowIssue[];
};

/** A row normalized into the shape the import mutation writes. */
export type NormalizedFiche = {
  line: number;
  /** Lowercased Correo — the seeded account email (and the photos map key). */
  correo: string;
  estado: Estado;
  /** Validated form fields (horario optional — see failure policy above). */
  form: CommerceFormInput;
  /** Ordered attachment filenames from the `Fotos` column (resolved by the CLI). */
  photoFilenames: string[];
};

const empty = (): ImportReport => ({
  ok: true,
  totalRows: 0,
  importable: 0,
  duplicateCorreos: [],
  rowsWithoutCorreo: [],
  invalidWhatsapp: [],
  invalidResides: [],
  unknownCategory: [],
  droppedSubcategories: [],
  unmappedHorario: [],
  unmappedEstado: [],
});

/** Collapse an empty/blank cell to `undefined` (optional fiche fields). */
function optional(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Normalize a raw WhatsApp cell to exactly 10 digits, tolerating the `+57`
 * country code, spaces and punctuation on the way in (the stored contract is
 * "10 digits, no +57" — spec §2/§4). Returns `null` when it cannot.
 */
export function normalizeWhatsapp(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) {
    digits = digits.slice(2);
  }
  return /^\d{10}$/.test(digits) ? digits : null;
}

/**
 * Map the free-text Notion `Estado` to the domain lifecycle: `Pendiente` →
 * `pendiente`; `Aprobado` and `Publicado` → `publicado`. Anything else (or
 * empty) defaults to `pendiente` — the fail-safe state invisible to the public
 * — and reports `mapped: false` so the operator can review it.
 */
export function mapEstado(raw: string): { estado: Estado; mapped: boolean } {
  switch (raw.trim().toLowerCase()) {
    case "pendiente":
      return { estado: "pendiente", mapped: true };
    case "aprobado":
    case "publicado":
      return { estado: "publicado", mapped: true };
    default:
      return { estado: "pendiente", mapped: false };
  }
}

/** Resolve a free-text Horario through the correspondence table (case-insensitive). */
function mapHorario(
  raw: string,
  table: HorarioMapping[],
): { horario?: Horario; unmapped: boolean } {
  const key = raw.trim().toLowerCase();
  if (key === "") return { unmapped: false }; // no hours provided, not an error
  const hit = table.find((m) => m.raw.trim().toLowerCase() === key);
  return hit ? { horario: hit.horario, unmapped: false } : { unmapped: true };
}

/**
 * Normalize the `Subcategoría` cell: split on commas, keep only known
 * `Comida y bebida` sub-categories, and DROP them entirely for any other
 * category (spec: "sous-catégories ignorées hors Comida y bebida").
 */
function normalizeSubcategories(
  category: string,
  raw: string,
): { subcategories?: string[]; droppedOutsideComida: boolean } {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  if (parts.length === 0) {
    return { subcategories: undefined, droppedOutsideComida: false };
  }
  if (!isComidaCategory(category)) {
    return { subcategories: undefined, droppedOutsideComida: true };
  }
  const known = parts.filter((p) => COMIDA_SUBCATEGORIES.includes(p as never));
  return {
    subcategories: known.length > 0 ? known : undefined,
    droppedOutsideComida: false,
  };
}

/** Split the ordered `Fotos` cell into attachment filenames. */
function parsePhotoFilenames(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

/**
 * Build the pre-write import plan from parsed Notion rows + the Horario table.
 * Never writes anything; the caller decides what to do with the report and the
 * fiches. When duplicate Correos are present, `report.ok` is false and NO fiche
 * is returned (zero-write abort).
 */
export function buildImportPlan(
  rows: NotionRow[],
  horarioTable: HorarioMapping[],
): { report: ImportReport; fiches: NormalizedFiche[] } {
  const report = empty();
  report.totalRows = rows.length;

  // Pass 1 — detect duplicate Correos (case-insensitive), the only hard abort.
  const counts = new Map<string, number>();
  for (const row of rows) {
    const correo = (row.values.Correo ?? "").trim().toLowerCase();
    if (correo === "") continue;
    counts.set(correo, (counts.get(correo) ?? 0) + 1);
  }
  report.duplicateCorreos = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([correo]) => correo);

  // Pass 2 — per-row diagnostics + normalization.
  const fiches: NormalizedFiche[] = [];
  for (const row of rows) {
    const { line } = row;
    // Read a cell by its (trimmed) header name, already trimmed.
    const cell = (header: string) => (row.values[header] ?? "").trim();

    const name = cell("Nombre del negocio");
    const correo = cell("Correo").toLowerCase();

    if (correo === "") {
      report.rowsWithoutCorreo.push({ line, name });
      continue;
    }

    const category = cell("Categoría");
    if (!COMMERCE_CATEGORIES.includes(category as never)) {
      report.unknownCategory.push({ line, correo, raw: category });
      continue;
    }

    const whatsapp = normalizeWhatsapp(cell("WhatsApp"));
    if (whatsapp === null) {
      report.invalidWhatsapp.push({ line, correo, raw: cell("WhatsApp") });
      continue;
    }

    const resides = cell("¿Resides en Monteazul?");
    if (!RESIDES_VALUES.includes(resides as ResidesValue)) {
      report.invalidResides.push({ line, correo, raw: resides });
      continue;
    }

    const { subcategories, droppedOutsideComida } = normalizeSubcategories(
      category,
      cell("Subcategoría"),
    );
    if (droppedOutsideComida) {
      report.droppedSubcategories.push({ line, correo });
    }

    const { horario, unmapped } = mapHorario(cell("Horario"), horarioTable);
    if (unmapped) {
      report.unmappedHorario.push({ line, correo, raw: cell("Horario") });
    }

    const { estado, mapped } = mapEstado(cell("Estado"));
    if (!mapped) {
      report.unmappedEstado.push({ line, correo, raw: cell("Estado") });
    }

    const form: CommerceFormInput = {
      name,
      category,
      subcategories,
      description: cell("Descripción"),
      whatsapp,
      horario,
      torreApto: optional(cell("Torre y apartamento")),
      instagram: optional(cell("Instagram / redes")),
      contactName: optional(cell("Nombre de contacto")),
      resides,
      notas: optional(cell("Notas")),
    };

    fiches.push({
      line,
      correo,
      estado,
      form,
      photoFilenames: parsePhotoFilenames(cell("Fotos")),
    });
  }

  // A duplicate Correo aborts the whole import: report it, write nothing.
  if (report.duplicateCorreos.length > 0) {
    report.ok = false;
    report.importable = 0;
    return { report, fiches: [] };
  }

  report.ok = true;
  report.importable = fiches.length;
  return { report, fiches };
}
