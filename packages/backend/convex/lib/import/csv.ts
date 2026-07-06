/**
 * Notion CSV parsing — the exact-format contract of the one-shot import
 * (`docs/product/notion-csv-format.md`). Pure module: no Convex imports, so the
 * parser can be unit-tested directly and reused by the operator's CLI wrapper.
 *
 * Copes with every documented pitfall of the "CSV & fichiers" Notion export:
 * a leading UTF-8 BOM, header names with a trailing space (`Subcategoría ` and
 * `Notas `, quoted in the header), quoted fields containing commas, doubled
 * quotes (`""`) and newlines embedded inside quoted fields.
 */

/** The 16 Notion export columns, in order, WITHOUT the trailing-space quirk. */
export const NOTION_HEADERS = [
  "Created time",
  "Nombre del negocio",
  "Descripción",
  "Categoría",
  "Subcategoría",
  "WhatsApp",
  "Nombre de contacto",
  "Correo",
  "Instagram / redes",
  "Horario",
  "PDF (portafolio)",
  "Fotos",
  "¿Resides en Monteazul?",
  "Torre y apartamento",
  "Notas",
  "Estado",
] as const;

export type NotionHeader = (typeof NOTION_HEADERS)[number];

/** One parsed data row: its spreadsheet line (header = line 1) + trimmed cells. */
export type NotionRow = {
  /** 1-based spreadsheet line — header is line 1, first data row is line 2. */
  line: number;
  /** Cell values keyed by the TRIMMED header name (trailing spaces removed). */
  values: Record<string, string>;
};

/** Strip a single leading UTF-8 BOM (U+FEFF), if present. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * RFC 4180-style CSV parser. Returns a grid of rows × cells. Handles quoted
 * fields (commas, embedded newlines, `""`-escaped quotes) and both `\n` and
 * `\r\n` line endings. A lone trailing empty line (file ending with a newline)
 * is dropped so it never becomes a phantom row.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      pushRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  // Flush the last field/row (a file need not end with a newline).
  pushRow();

  // Drop a single trailing empty row produced by a terminal newline.
  const last = rows[rows.length - 1];
  if (last && last.length === 1 && last[0] === "") rows.pop();

  return rows;
}

/**
 * Parse a Notion export into data rows keyed by their TRIMMED header names, so
 * the trailing-space columns (`Subcategoría `, `Notas `) are addressable as
 * `Subcategoría` / `Notas`. Strips the BOM, skips fully blank lines, and trims
 * each cell. The first grid row is treated as the header.
 */
export function parseNotionCsv(text: string): NotionRow[] {
  const grid = parseCsv(stripBom(text));
  if (grid.length === 0) return [];

  const headers = grid[0].map((h) => h.trim());
  const rows: NotionRow[] = [];

  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    if (cells.every((c) => c.trim() === "")) continue; // skip blank lines
    const values: Record<string, string> = {};
    headers.forEach((header, idx) => {
      values[header] = (cells[idx] ?? "").trim();
    });
    rows.push({ line: r + 1, values });
  }

  return rows;
}
