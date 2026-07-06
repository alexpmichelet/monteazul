import { describe, expect, test } from "vitest";
import { NOTION_HEADERS, parseCsv, parseNotionCsv, stripBom } from "./csv";

// A tiny, hand-built CSV matching the Notion contract (BOM + trailing-space
// headers), used to prove the parser copes with every documented pitfall
// (docs/product/notion-csv-format.md). 100% invented data.
const BOM = "﻿";
const HEADER =
  'Created time,Nombre del negocio,Descripción,Categoría,"Subcategoría ",WhatsApp,Nombre de contacto,Correo,Instagram / redes,Horario,PDF (portafolio),Fotos,¿Resides en Monteazul?,Torre y apartamento,"Notas ",Estado';

describe("stripBom", () => {
  test("strips a leading UTF-8 BOM", () => {
    expect(stripBom(`${BOM}Created time`)).toBe("Created time");
  });

  test("is a no-op when there is no BOM", () => {
    expect(stripBom("Created time")).toBe("Created time");
  });
});

describe("parseCsv", () => {
  test("keeps commas that live inside quoted fields", () => {
    const grid = parseCsv('a,"b, still b",c');
    expect(grid).toEqual([["a", "b, still b", "c"]]);
  });

  test("unescapes doubled quotes inside a quoted field", () => {
    const grid = parseCsv('"she said ""hola""",x');
    expect(grid).toEqual([['she said "hola"', "x"]]);
  });

  test("keeps newlines that live inside quoted fields", () => {
    const grid = parseCsv('"line1\nline2",x\ny,z');
    expect(grid).toEqual([["line1\nline2", "x"], ["y", "z"]]);
  });

  test("handles CRLF line endings", () => {
    const grid = parseCsv("a,b\r\nc,d");
    expect(grid).toEqual([["a", "b"], ["c", "d"]]);
  });

  test("drops a trailing empty line", () => {
    const grid = parseCsv("a,b\n");
    expect(grid).toEqual([["a", "b"]]);
  });
});

describe("parseNotionCsv", () => {
  test("strips the BOM and trims the trailing-space header names", () => {
    const csv = `${BOM}${HEADER}\n"July 1, 2026",Arepas,"Ricas, calientes",Comida y bebida,Almuerzos y comida típica,3201112233,Ana,ana@example.com,ana.ig,Bajo pedido,,foto.jpg,Resido en Monteazul,Torre 4,Nota interna,Publicado`;
    const rows = parseNotionCsv(csv);
    expect(rows).toHaveLength(1);
    // `Subcategoría ` and `Notas ` have a trailing space in the file — the
    // parser matches them by their trimmed name.
    expect(rows[0].values["Subcategoría"]).toBe("Almuerzos y comida típica");
    expect(rows[0].values["Notas"]).toBe("Nota interna");
    expect(rows[0].values["Nombre del negocio"]).toBe("Arepas");
    expect(rows[0].values["Descripción"]).toBe("Ricas, calientes");
    expect(rows[0].values["Correo"]).toBe("ana@example.com");
  });

  test("numbers rows by their spreadsheet line (header = line 1)", () => {
    const csv = `${HEADER}\nx1,A,d,Comida y bebida,,3201112233,,a@example.com,,,,,Resido en Monteazul,,,Publicado\nx2,B,d,Mascotas,,3201112234,,b@example.com,,,,,Resido en Monteazul,,,Publicado`;
    const rows = parseNotionCsv(csv);
    expect(rows.map((r) => r.line)).toEqual([2, 3]);
  });

  test("skips fully blank lines", () => {
    const csv = `${HEADER}\n\nx1,A,d,Comida y bebida,,3201112233,,a@example.com,,,,,Resido en Monteazul,,,Publicado\n`;
    const rows = parseNotionCsv(csv);
    expect(rows).toHaveLength(1);
  });

  test("exposes the exact 16 Notion headers", () => {
    expect(NOTION_HEADERS).toHaveLength(16);
    expect(NOTION_HEADERS).toContain("¿Resides en Monteazul?");
    expect(NOTION_HEADERS).toContain("PDF (portafolio)");
  });
});
