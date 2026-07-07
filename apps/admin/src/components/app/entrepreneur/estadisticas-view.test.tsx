import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";
import { EstadisticasView } from "./estadisticas-view";

// The recharts evolution chart needs a real layout/ResizeObserver, which jsdom
// lacks. This test covers the totals cards and the period selector wiring, so
// stub the chart to a marker element.
vi.mock("./stats-evolution-chart", () => ({
  StatsEvolutionChart: () => <div data-testid="evolution-chart" />,
}));

const commerceId = "cid_1" as unknown as Id<"commerces">;

describe("EstadisticasView", () => {
  it("renders the Visitas and Contactos por WhatsApp totals", () => {
    const client = new ConvexReactClientFake();
    client.registerQueryFake(api.table.events.statsForCommerce, () => ({
      totals: { visits: 42, whatsappContacts: 7 },
      series: [],
    }));

    renderWithConvex(<EstadisticasView commerceId={commerceId} />, { client });

    expect(screen.getByText("Visitas")).toBeTruthy();
    expect(screen.getByText("Contactos por WhatsApp")).toBeTruthy();
    expect(screen.getByTestId("stat-visitas-value").textContent).toBe("42");
    expect(screen.getByTestId("stat-whatsapp-value").textContent).toBe("7");
  });

  it("re-queries with the chosen period when the selector changes", async () => {
    const client = new ConvexReactClientFake();
    const statsFake = vi.fn((args: { period: string }) => ({
      totals:
        args.period === "month"
          ? { visits: 5, whatsappContacts: 2 }
          : { visits: 42, whatsappContacts: 7 },
      series: [],
    }));
    client.registerQueryFake(api.table.events.statsForCommerce, statsFake);

    renderWithConvex(<EstadisticasView commerceId={commerceId} />, { client });

    // Defaults to "Esta semana".
    expect(statsFake).toHaveBeenCalledWith({ commerceId, period: "week" });
    expect(screen.getByTestId("stat-visitas-value").textContent).toBe("42");

    fireEvent.click(screen.getByRole("button", { name: "Este mes" }));

    await waitFor(() =>
      expect(statsFake).toHaveBeenCalledWith({
        commerceId,
        period: "month",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("stat-visitas-value").textContent).toBe("5"),
    );
  });

  it("renders the evolution chart with the period selector when there is data", () => {
    const client = new ConvexReactClientFake();
    client.registerQueryFake(api.table.events.statsForCommerce, () => ({
      totals: { visits: 3, whatsappContacts: 1 },
      series: [{ bucket: "2026-07-06", visits: 3, whatsappContacts: 1 }],
    }));

    renderWithConvex(<EstadisticasView commerceId={commerceId} />, { client });

    expect(screen.getByTestId("evolution-chart")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Esta semana" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Este mes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Todo" })).toBeTruthy();
  });

  it("shows an empty state when there are no data points", () => {
    const client = new ConvexReactClientFake();
    client.registerQueryFake(api.table.events.statsForCommerce, () => ({
      totals: { visits: 0, whatsappContacts: 0 },
      series: [],
    }));

    renderWithConvex(<EstadisticasView commerceId={commerceId} />, { client });

    expect(screen.getByText("Aún no hay datos para mostrar.")).toBeTruthy();
  });
});
