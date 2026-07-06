import { describe, expect, it } from "vitest";
import {
  ESTADOS,
  RESIDES_VALUES,
  assertValidCommerce,
} from "./lib/commerce";

const base = {
  category: "Comida y bebida" as const,
  whatsapp: "3182173887",
};

describe("assertValidCommerce — sub-categories", () => {
  it("accepts sub-categories when the category is Comida y bebida", () => {
    expect(() =>
      assertValidCommerce({
        ...base,
        subcategories: ["Almuerzos y comida típica", "Helados y postres"],
      }),
    ).not.toThrow();
  });

  it("rejects sub-categories when the category is not Comida y bebida", () => {
    expect(() =>
      assertValidCommerce({
        category: "Tecnología",
        whatsapp: "3182173887",
        subcategories: ["Otros"],
      }),
    ).toThrow(/comida y bebida/i);
  });

  it("rejects an unknown Comida sub-category value", () => {
    expect(() =>
      assertValidCommerce({
        ...base,
        subcategories: ["No existe"],
      }),
    ).toThrow(/subcategor/i);
  });

  it("accepts a Comida commerce with no sub-categories", () => {
    expect(() => assertValidCommerce(base)).not.toThrow();
  });
});

describe("assertValidCommerce — category & WhatsApp", () => {
  it("rejects an unknown category", () => {
    expect(() =>
      assertValidCommerce({ category: "Restaurantes", whatsapp: "3182173887" }),
    ).toThrow(/categor/i);
  });

  it("rejects a WhatsApp number that is not exactly 10 digits", () => {
    expect(() =>
      assertValidCommerce({ ...base, whatsapp: "318217388" }),
    ).toThrow(/whatsapp/i);
    expect(() =>
      assertValidCommerce({ ...base, whatsapp: "+573182173887" }),
    ).toThrow(/whatsapp/i);
    expect(() =>
      assertValidCommerce({ ...base, whatsapp: "318 217 3887" }),
    ).toThrow(/whatsapp/i);
  });

  it("accepts a valid 10-digit WhatsApp number", () => {
    expect(() =>
      assertValidCommerce({ category: "Otro", whatsapp: "3001234567" }),
    ).not.toThrow();
  });
});

describe("Commerce enums", () => {
  it("defines the three estados of the lifecycle", () => {
    expect(ESTADOS).toEqual(["pendiente", "publicado", "suspendido"]);
  });

  it("defines the three ¿Resides en Monteazul? values from the spec", () => {
    expect(RESIDES_VALUES).toEqual([
      "Resido en Monteazul",
      "Resido cerca de la zona",
      "No resido cerca de la zona",
    ]);
  });
});
