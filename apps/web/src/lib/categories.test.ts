import { describe, expect, it } from "vitest";

import {
  CATEGORY_CHIPS,
  CATEGORY_CHIP_BY_KEY,
  type CategoryChip,
} from "./categories";

describe("CATEGORY_CHIPS", () => {
  it("exposes the Todos filter plus the seven documented categories in order", () => {
    expect(CATEGORY_CHIPS.map((c) => c.key)).toEqual([
      "todos",
      "comida",
      "mascotas",
      "belleza",
      "salud",
      "ropa",
      "hogar",
      "tecnologia",
    ]);
  });

  it("maps each chip to the exact design token colours from docs/product/design.md", () => {
    const byKey = (key: CategoryChip["key"]) =>
      CATEGORY_CHIPS.find((c) => c.key === key);

    expect(byKey("todos")).toMatchObject({ color: "#1C2E4A", pastel: "#EEF1F6" });
    expect(byKey("comida")).toMatchObject({ color: "#E07B39", pastel: "#FBEEE3" });
    expect(byKey("mascotas")).toMatchObject({ color: "#0E9E8E", pastel: "#E0F2EF" });
    expect(byKey("belleza")).toMatchObject({ color: "#C85BA0", pastel: "#F7E7F1" });
    expect(byKey("salud")).toMatchObject({ color: "#2E9E5B", pastel: "#E4F4EA" });
    expect(byKey("ropa")).toMatchObject({ color: "#5B62D6", pastel: "#E8E9FB" });
    expect(byKey("hogar")).toMatchObject({ color: "#C2922B", pastel: "#F6EEDA" });
    expect(byKey("tecnologia")).toMatchObject({ color: "#3D7FD1", pastel: "#E4EEFA" });
  });

  it("binds each real chip to its canonical Spanish Commerce category, and Todos to none", () => {
    expect(CATEGORY_CHIP_BY_KEY.todos.category).toBeNull();
    expect(CATEGORY_CHIP_BY_KEY.comida.category).toBe("Comida y bebida");
    expect(CATEGORY_CHIP_BY_KEY.belleza.category).toBe("Belleza y cuidado personal");
    expect(CATEGORY_CHIP_BY_KEY.ropa.category).toBe("Accesorios y ropa");
    expect(CATEGORY_CHIP_BY_KEY.hogar.category).toBe("Hogar y artesanías");
    expect(CATEGORY_CHIP_BY_KEY.tecnologia.category).toBe("Tecnología");
  });

  it("ships a renderable icon component for every chip", () => {
    for (const chip of CATEGORY_CHIPS) {
      expect(chip.Icon).toBeTruthy();
    }
  });
});
