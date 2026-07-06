import { describe, expect, it } from "vitest";

import {
  formatColombianPhone,
  instagramLink,
  whatsAppLink,
} from "./commerce-contact";

describe("formatColombianPhone", () => {
  it("formats a 10-digit number as « +57 XXX XXX XXXX »", () => {
    expect(formatColombianPhone("3182173887")).toBe("+57 318 217 3887");
  });

  it("returns the raw digits with the +57 prefix for unexpected lengths", () => {
    // Defensive: never throws on malformed data, just prefixes.
    expect(formatColombianPhone("318217")).toBe("+57 318 217");
  });
});

describe("whatsAppLink", () => {
  it("builds a wa.me link with the Colombia prefix and prefilled message", () => {
    expect(whatsAppLink("3182173887")).toBe(
      "https://wa.me/573182173887?text=Hola%2C%20te%20escribo%20desde%20el%20directorio%20de%20Monteazul",
    );
  });
});

describe("instagramLink", () => {
  it("turns a bare handle into a display handle and profile URL", () => {
    expect(instagramLink("sazon.abuela")).toEqual({
      handle: "@sazon.abuela",
      href: "https://instagram.com/sazon.abuela",
    });
  });

  it("accepts a handle already prefixed with @", () => {
    expect(instagramLink("@sazon.abuela")).toEqual({
      handle: "@sazon.abuela",
      href: "https://instagram.com/sazon.abuela",
    });
  });

  it("extracts the handle from a full instagram.com URL", () => {
    expect(instagramLink("https://instagram.com/sazon.abuela/")).toEqual({
      handle: "@sazon.abuela",
      href: "https://instagram.com/sazon.abuela",
    });
  });
});
