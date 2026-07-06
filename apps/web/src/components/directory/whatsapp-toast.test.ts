import { describe, expect, it } from "vitest";

import { whatsAppRedirectMessage } from "./whatsapp-toast";

describe("whatsAppRedirectMessage", () => {
  it("builds the Spanish redirect message with the commerce name", () => {
    expect(whatsAppRedirectMessage("Panadería El Trigal")).toBe(
      "Redirigiendo a WhatsApp de Panadería El Trigal…",
    );
  });
});
