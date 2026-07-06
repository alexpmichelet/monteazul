import { describe, expect, it } from "vitest";
import {
  CATEGORY_CHIP_TOKENS,
  COMIDA_CATEGORY,
  COMIDA_SUBCATEGORIES,
  COMMERCE_CATEGORIES,
  TODOS_CHIP,
  isComidaCategory,
} from "./categories.js";

describe("@packages/shared Commerce taxonomy", () => {
  it("lists the nine canonical categories in the spec §3 order (exact Spanish)", () => {
    expect(COMMERCE_CATEGORIES).toEqual([
      "Comida y bebida",
      "Mascotas",
      "Belleza y cuidado personal",
      "Salud y bienestar",
      "Accesorios y ropa",
      "Hogar y artesanías",
      "Tecnología",
      "Inmuebles y servicios",
      "Otro",
    ]);
  });

  it("lists the seven Comida y bebida sub-categories (exact Spanish)", () => {
    expect(COMIDA_SUBCATEGORIES).toEqual([
      "Almuerzos y comida típica",
      "Panadería y repostería",
      "Carnes y embutidos",
      "Frutas y mercado",
      "Snacks y saludables",
      "Helados y postres",
      "Otros",
    ]);
  });

  it("marks only Comida y bebida as the sub-category-bearing category", () => {
    expect(COMIDA_CATEGORY).toBe("Comida y bebida");
    expect(isComidaCategory("Comida y bebida")).toBe(true);
    for (const category of COMMERCE_CATEGORIES) {
      if (category !== COMIDA_CATEGORY) {
        expect(isComidaCategory(category)).toBe(false);
      }
    }
  });

  it("exposes the Todos filter chip token (navy) from design.md", () => {
    expect(TODOS_CHIP).toEqual({
      label: "Todos",
      color: "#1C2E4A",
      pastel: "#EEF1F6",
    });
  });

  it("maps each documented category to its exact chip colour/pastel/label", () => {
    expect(CATEGORY_CHIP_TOKENS["Comida y bebida"]).toEqual({
      label: "Comida",
      color: "#E07B39",
      pastel: "#FBEEE3",
    });
    expect(CATEGORY_CHIP_TOKENS["Mascotas"]).toEqual({
      label: "Mascotas",
      color: "#0E9E8E",
      pastel: "#E0F2EF",
    });
    expect(CATEGORY_CHIP_TOKENS["Belleza y cuidado personal"]).toEqual({
      label: "Belleza",
      color: "#C85BA0",
      pastel: "#F7E7F1",
    });
    expect(CATEGORY_CHIP_TOKENS["Salud y bienestar"]).toEqual({
      label: "Salud",
      color: "#2E9E5B",
      pastel: "#E4F4EA",
    });
    expect(CATEGORY_CHIP_TOKENS["Accesorios y ropa"]).toEqual({
      label: "Ropa",
      color: "#5B62D6",
      pastel: "#E8E9FB",
    });
    expect(CATEGORY_CHIP_TOKENS["Hogar y artesanías"]).toEqual({
      label: "Hogar",
      color: "#C2922B",
      pastel: "#F6EEDA",
    });
    expect(CATEGORY_CHIP_TOKENS["Tecnología"]).toEqual({
      label: "Tecnología",
      color: "#3D7FD1",
      pastel: "#E4EEFA",
    });
  });

  it("carries chip tokens only for the seven documented categories (not Inmuebles/Otro)", () => {
    expect(Object.keys(CATEGORY_CHIP_TOKENS)).toHaveLength(7);
    expect(CATEGORY_CHIP_TOKENS["Inmuebles y servicios"]).toBeUndefined();
    expect(CATEGORY_CHIP_TOKENS["Otro"]).toBeUndefined();
  });
});
