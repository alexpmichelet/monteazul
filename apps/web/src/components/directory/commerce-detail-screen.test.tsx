import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";

import { CommerceDetailScreen } from "./commerce-detail-screen";
import { notifyWhatsAppRedirect } from "./whatsapp-toast";

const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("./whatsapp-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./whatsapp-toast")>();
  return { ...actual, notifyWhatsAppRedirect: vi.fn() };
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

type DetailCommerce = NonNullable<
  FunctionReturnType<typeof api.table.commerces.getPublicById>
>;

function makeCommerce(
  overrides: Partial<DetailCommerce> = {},
): DetailCommerce {
  return {
    _id: "commerce_1" as unknown as Id<"commerces">,
    _creationTime: 0,
    name: "Sazón de la Abuela",
    category: "Comida y bebida",
    subcategories: ["Almuerzos y comida típica"],
    description: "Almuerzos caseros y comida típica colombiana.",
    whatsapp: "3182173887",
    photos: [],
    horario: { mode: "plages", days: "Lun – Vie", from: 690, to: 900 },
    torreApto: "Torre 4 · Apto 926",
    instagram: "sazon.abuela",
    contactName: "María López",
    ...overrides,
  };
}

type ClickArgs = { commerceId: string; visitorId: string };

function renderDetail(result: DetailCommerce | null | undefined) {
  const recorded: ClickArgs[] = [];
  const client = new ConvexReactClientFake();
  client.registerQueryFake(
    api.table.commerces.getPublicById,
    () => result as DetailCommerce | null,
  );
  client.registerMutationFake(
    api.table.events.recordWhatsAppClick,
    (args) => {
      recorded.push(args as ClickArgs);
      return null;
    },
  );
  const view = renderWithConvex(<CommerceDetailScreen id="commerce_1" />, {
    client,
  });
  return { ...view, recorded };
}

describe("CommerceDetailScreen", () => {
  it("shows a loading state while the query is undefined", () => {
    renderDetail(undefined);
    expect(screen.getByTestId("detail-loading")).toBeDefined();
  });

  it("shows a not-found state with a link back to the directory when the fiche is not publicado", () => {
    renderDetail(null);
    expect(screen.getByTestId("detail-not-found")).toBeDefined();
    const link = screen.getByRole("link", { name: /directorio/i });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("renders the name, subcategory pill, location and description", () => {
    renderDetail(makeCommerce());
    expect(
      screen.getByRole("heading", { name: "Sazón de la Abuela" }),
    ).toBeDefined();
    expect(screen.getByText("Almuerzos y comida típica")).toBeDefined();
    expect(screen.getByText("Torre 4 · Apto 926")).toBeDefined();
    expect(
      screen.getByText(/Almuerzos caseros y comida típica colombiana/),
    ).toBeDefined();
  });

  it("renders the Horario card with days and formatted hours", () => {
    renderDetail(makeCommerce());
    expect(screen.getByText("Lun – Vie")).toBeDefined();
    expect(screen.getByText("11:30 – 15:00")).toBeDefined();
  });

  it("renders the « Disponible » horario mode with its state text and no hour range", () => {
    renderDetail(
      makeCommerce({
        horario: { mode: "disponible", label: "con cita previa" },
      }),
    );
    expect(screen.getByText("Disponible · con cita previa")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders the phone in « +57 XXX XXX XXXX » format and the Instagram link", () => {
    renderDetail(makeCommerce());
    expect(screen.getByText("+57 318 217 3887")).toBeDefined();
    const ig = screen.getByRole("link", { name: "@sazon.abuela" });
    expect(ig.getAttribute("href")).toBe("https://instagram.com/sazon.abuela");
  });

  it("keeps the sticky WhatsApp CTA linking to wa.me (redirect works even if tracking fails)", () => {
    renderDetail(makeCommerce());
    const cta = screen.getByRole("link", { name: /Escribir por WhatsApp/ });
    expect(cta.getAttribute("href")).toBe(
      "https://wa.me/573182173887?text=Hola%2C%20te%20escribo%20desde%20el%20directorio%20de%20Monteazul",
    );
  });

  it("records a whatsapp_click and shows the toast when the CTA is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "open").mockReturnValue(null);
    const { recorded } = renderDetail(makeCommerce());

    await user.click(
      screen.getByRole("link", { name: /Escribir por WhatsApp/ }),
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0].commerceId).toBe("commerce_1");
    expect(typeof recorded[0].visitorId).toBe("string");
    expect(recorded[0].visitorId.length).toBeGreaterThan(0);
    expect(notifyWhatsAppRedirect).toHaveBeenCalledWith("Sazón de la Abuela");
  });

  it("does not render internal fields even if present in the data", () => {
    renderDetail(makeCommerce());
    // The public projection never carries resides/notas; assert the words the
    // internal notes could contain never leak into the rendered detail.
    expect(screen.queryByText(/Resido en Monteazul/)).toBeNull();
    expect(screen.queryByText(/Nota interna/)).toBeNull();
  });

  it("goes back when the floating back button is pressed", async () => {
    const user = userEvent.setup();
    renderDetail(makeCommerce());
    await user.click(screen.getByRole("button", { name: /Volver/ }));
    expect(back).toHaveBeenCalledTimes(1);
  });
});
