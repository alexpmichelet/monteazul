import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";

import { CommerceCard, type DirectoryCommerce } from "./commerce-card";
import { notifyWhatsAppRedirect } from "./whatsapp-toast";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    "aria-label"?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("./whatsapp-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./whatsapp-toast")>();
  return { ...actual, notifyWhatsAppRedirect: vi.fn() };
});

const WA_HREF =
  "https://wa.me/573182173887?text=Hola%2C%20te%20escribo%20desde%20el%20directorio%20de%20Monteazul";

const commerce: DirectoryCommerce = {
  _id: "commerce_42" as unknown as Id<"commerces">,
  _creationTime: 0,
  name: "Sazón de la Abuela",
  category: "Comida y bebida",
  subcategories: ["Almuerzos y comida típica"],
  description: "Almuerzos caseros.",
  whatsapp: "3182173887",
  photos: [],
  horario: {
    mode: "semanal",
    windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      from: 690,
      to: 900,
    })),
  },
  torreApto: "Torre 4 · Apto 926",
  instagram: "sazon.abuela",
  contactName: "María López",
};

type ClickArgs = { commerceId: string; visitorId: string };

function renderCard(
  mutationImpl: (args: ClickArgs) => void = () => {},
): { recorded: ClickArgs[] } {
  const recorded: ClickArgs[] = [];
  const client = new ConvexReactClientFake();
  client.registerMutationFake(
    api.table.events.recordWhatsAppClick,
    (args) => {
      recorded.push(args as ClickArgs);
      mutationImpl(args as ClickArgs);
      return null;
    },
  );
  renderWithConvex(<CommerceCard commerce={commerce} now={new Date()} />, {
    client,
  });
  return { recorded };
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("CommerceCard", () => {
  it("links to the public detail page of the commerce", () => {
    renderCard();
    const link = screen.getByRole("link", { name: /Sazón de la Abuela/ });
    expect(link.getAttribute("href")).toBe("/negocio/commerce_42");
  });

  it("records a whatsapp_click, shows the toast and opens wa.me when the WhatsApp button is clicked", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { recorded } = renderCard();

    await user.click(
      screen.getByRole("button", { name: /Escribir por WhatsApp/ }),
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0].commerceId).toBe("commerce_42");
    expect(typeof recorded[0].visitorId).toBe("string");
    expect(recorded[0].visitorId.length).toBeGreaterThan(0);
    expect(notifyWhatsAppRedirect).toHaveBeenCalledWith("Sazón de la Abuela");
    expect(open).toHaveBeenCalledWith(WA_HREF, "_blank", "noopener,noreferrer");
  });

  it("does not navigate the card link when the WhatsApp button is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "open").mockReturnValue(null);
    renderCard();

    const button = screen.getByRole("button", {
      name: /Escribir por WhatsApp/,
    });
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(clickEvent);
    await user.click(button);

    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it("still opens wa.me even if recording the click fails (contact prime sur la stat)", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderCard(() => {
      throw new Error("network down");
    });

    await user.click(
      screen.getByRole("button", { name: /Escribir por WhatsApp/ }),
    );

    expect(open).toHaveBeenCalledWith(WA_HREF, "_blank", "noopener,noreferrer");
  });
});
