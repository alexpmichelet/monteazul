import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { CommerceCard, type DirectoryCommerce } from "./commerce-card";

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

const commerce: DirectoryCommerce = {
  _id: "commerce_42" as unknown as Id<"commerces">,
  _creationTime: 0,
  name: "Sazón de la Abuela",
  category: "Comida y bebida",
  subcategories: ["Almuerzos y comida típica"],
  description: "Almuerzos caseros.",
  whatsapp: "3182173887",
  photos: [],
  horario: { mode: "plages", days: "Lun – Vie", from: 690, to: 900 },
  torreApto: "Torre 4 · Apto 926",
  instagram: "sazon.abuela",
  contactName: "María López",
};

describe("CommerceCard", () => {
  it("links to the public detail page of the commerce", () => {
    render(<CommerceCard commerce={commerce} now={new Date()} />);
    const link = screen.getByRole("link", { name: /Sazón de la Abuela/ });
    expect(link.getAttribute("href")).toBe("/negocio/commerce_42");
  });
});
