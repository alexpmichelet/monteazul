import { describe, expect, test } from "vitest";
import fixtureCsv from "./fixtures/notion-export.fixture.csv?raw";
import horarioMapFixture from "./fixtures/notion-horario-map.fixture.json";
import { parseNotionCsv } from "./csv";
import {
  type HorarioMapping,
  buildImportPlan,
  mapEstado,
  normalizeWhatsapp,
} from "./plan";

const horarioMap = horarioMapFixture as HorarioMapping[];

/** Build a plan straight from the versioned invented fixture. */
function planFromFixture() {
  return buildImportPlan(parseNotionCsv(fixtureCsv), horarioMap);
}

/** Find the normalized fiche for a given (lowercased) Correo. */
function fiche(email: string) {
  const { fiches } = planFromFixture();
  const found = fiches.find((f) => f.correo === email);
  if (!found) throw new Error(`fiche not found: ${email}`);
  return found;
}

const HEADER =
  'Created time,Nombre del negocio,Descripción,Categoría,"Subcategoría ",WhatsApp,Nombre de contacto,Correo,Instagram / redes,Horario,PDF (portafolio),Fotos,¿Resides en Monteazul?,Torre y apartamento,"Notas ",Estado';

/** A minimal valid data row with overridable cells (by header). */
function row(overrides: Record<string, string> = {}): string {
  const base: Record<string, string> = {
    "Created time": "July 1, 2026",
    "Nombre del negocio": "Negocio",
    Descripción: "Una descripción.",
    Categoría: "Mascotas",
    "Subcategoría": "",
    WhatsApp: "3201112233",
    "Nombre de contacto": "Ana",
    Correo: "ana@example.com",
    "Instagram / redes": "",
    Horario: "",
    "PDF (portafolio)": "",
    Fotos: "",
    "¿Resides en Monteazul?": "Resido en Monteazul",
    "Torre y apartamento": "",
    Notas: "",
    Estado: "Publicado",
  };
  const order = [
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
  ];
  const merged = { ...base, ...overrides };
  return order
    .map((h) => {
      const value = merged[h] ?? "";
      return value.includes(",") ? `"${value}"` : value;
    })
    .join(",");
}

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// normalizeWhatsapp — 10 digits, tolerant of +57 and spaces on the way in.
// ---------------------------------------------------------------------------

describe("normalizeWhatsapp", () => {
  test("strips +57, spaces and punctuation down to 10 digits", () => {
    expect(normalizeWhatsapp("+57 320 111 2233")).toBe("3201112233");
    expect(normalizeWhatsapp("320-111-2233")).toBe("3201112233");
  });

  test("keeps an already-clean 10-digit number", () => {
    expect(normalizeWhatsapp("3201112233")).toBe("3201112233");
  });

  test("returns null when it cannot make 10 digits", () => {
    expect(normalizeWhatsapp("12345")).toBeNull();
    expect(normalizeWhatsapp("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapEstado — Pendiente → pendiente ; Aprobado/Publicado → publicado.
// ---------------------------------------------------------------------------

describe("mapEstado", () => {
  test("maps the three known Notion states", () => {
    expect(mapEstado("Pendiente")).toEqual({ estado: "pendiente", mapped: true });
    expect(mapEstado("Aprobado")).toEqual({ estado: "publicado", mapped: true });
    expect(mapEstado("Publicado")).toEqual({ estado: "publicado", mapped: true });
  });

  test("defaults an unknown/empty state to `pendiente` (not public) and flags it", () => {
    expect(mapEstado("")).toEqual({ estado: "pendiente", mapped: false });
    expect(mapEstado("Archivado")).toEqual({
      estado: "pendiente",
      mapped: false,
    });
  });
});

// ---------------------------------------------------------------------------
// buildImportPlan on the versioned invented fixture.
// ---------------------------------------------------------------------------

describe("buildImportPlan — fixture", () => {
  test("is importable and yields the five rows that carry a Correo", () => {
    const { report } = planFromFixture();
    expect(report.ok).toBe(true);
    expect(report.duplicateCorreos).toEqual([]);
    expect(report.importable).toBe(5);
  });

  test("ignores and lists the row without a Correo", () => {
    const { report, fiches } = planFromFixture();
    expect(report.rowsWithoutCorreo).toHaveLength(1);
    expect(report.rowsWithoutCorreo[0].name).toBe("Mascotas Felices");
    expect(fiches.some((f) => f.form.name === "Mascotas Felices")).toBe(false);
  });

  test("maps Estado: Publicado & Aprobado → publicado, Pendiente → pendiente", () => {
    expect(fiche("arepas.laesquina@example.com").estado).toBe("publicado");
    expect(fiche("trigos.pan@example.com").estado).toBe("publicado"); // Aprobado
    expect(fiche("tecno.mz@example.com").estado).toBe("pendiente");
  });

  test("drops sub-categories outside « Comida y bebida » and lists them", () => {
    // Tecnología row carried a "Otros" sub-category in the CSV.
    expect(fiche("tecno.mz@example.com").form.subcategories).toBeUndefined();
    const { report } = planFromFixture();
    expect(report.droppedSubcategories).toHaveLength(1);
    expect(report.droppedSubcategories[0].correo).toBe("tecno.mz@example.com");
  });

  test("keeps sub-categories for a « Comida y bebida » row", () => {
    expect(fiche("arepas.laesquina@example.com").form.subcategories).toEqual([
      "Almuerzos y comida típica",
    ]);
  });

  test("resolves free-text Horario through the correspondence table", () => {
    expect(fiche("arepas.laesquina@example.com").form.horario).toEqual({
      mode: "plages",
      days: "Lun – Vie",
      from: 480,
      to: 960,
    });
    expect(fiche("tecno.mz@example.com").form.horario).toEqual({
      mode: "disponible",
      label: "sobre pedido",
    });
    expect(report0().unmappedHorario).toEqual([]);
  });

  test("normalizes the +57 / spaced WhatsApp to 10 digits", () => {
    expect(fiche("arepas.laesquina@example.com").form.whatsapp).toBe(
      "3201112233",
    );
  });

  test("parses the ordered Fotos filenames", () => {
    expect(fiche("arepas.laesquina@example.com").photoFilenames).toEqual([
      "foto-a1.jpg",
      "foto-a2.jpg",
    ]);
  });
});

function report0() {
  return planFromFixture().report;
}

// ---------------------------------------------------------------------------
// Duplicate Correo → hard failure, zero fiches (operator cleans + re-runs).
// ---------------------------------------------------------------------------

describe("buildImportPlan — duplicate Correo", () => {
  test("fails with the duplicate listed and produces no importable fiche", () => {
    const input = csv(
      row({ Correo: "dup@example.com", "Nombre del negocio": "Uno" }),
      row({ Correo: "DUP@example.com", "Nombre del negocio": "Dos" }),
      row({ Correo: "solo@example.com", "Nombre del negocio": "Tres" }),
    );
    const { report, fiches } = buildImportPlan(parseNotionCsv(input), horarioMap);
    expect(report.ok).toBe(false);
    expect(report.duplicateCorreos).toContain("dup@example.com");
    expect(fiches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Per-row validation failures are flagged and skipped (not a global abort).
// ---------------------------------------------------------------------------

describe("buildImportPlan — per-row validation", () => {
  test("flags and skips a row whose WhatsApp cannot be normalized", () => {
    const input = csv(row({ Correo: "bad-wa@example.com", WhatsApp: "12" }));
    const { report, fiches } = buildImportPlan(parseNotionCsv(input), horarioMap);
    expect(report.invalidWhatsapp.map((w) => w.correo)).toContain(
      "bad-wa@example.com",
    );
    expect(fiches).toHaveLength(0);
  });

  test("flags and skips a row with an unrecognized ¿Resides? value", () => {
    const input = csv(
      row({ Correo: "bad-res@example.com", "¿Resides en Monteazul?": "Tal vez" }),
    );
    const { report, fiches } = buildImportPlan(parseNotionCsv(input), horarioMap);
    expect(report.invalidResides.map((r) => r.correo)).toContain(
      "bad-res@example.com",
    );
    expect(fiches).toHaveLength(0);
  });

  test("flags and skips a row with an unknown Categoría", () => {
    const input = csv(
      row({ Correo: "bad-cat@example.com", Categoría: "Zzz desconocida" }),
    );
    const { report, fiches } = buildImportPlan(parseNotionCsv(input), horarioMap);
    expect(report.unknownCategory.map((c) => c.correo)).toContain(
      "bad-cat@example.com",
    );
    expect(fiches).toHaveLength(0);
  });

  test("imports a row with unmapped Horario but flags it (no horario set)", () => {
    const input = csv(
      row({ Correo: "no-hor@example.com", Horario: "Cuando abra, abre" }),
    );
    const { report, fiches } = buildImportPlan(parseNotionCsv(input), horarioMap);
    expect(fiches).toHaveLength(1);
    expect(fiches[0].form.horario).toBeUndefined();
    expect(report.unmappedHorario.map((h) => h.correo)).toContain(
      "no-hor@example.com",
    );
  });
});
