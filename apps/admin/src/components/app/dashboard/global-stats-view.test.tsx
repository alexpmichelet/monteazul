import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { api } from "@packages/backend/convex/_generated/api";

import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";
import { GlobalStatsView } from "./global-stats-view";

// The recharts evolution chart needs a real layout/ResizeObserver, which jsdom
// lacks. These tests cover the totals, estado breakdown, ranking and the period
// selector wiring, so stub the chart to a marker element.
vi.mock("@/components/app/entrepreneur/stats-evolution-chart", () => ({
  StatsEvolutionChart: () => <div data-testid="evolution-chart" />,
}));

const FULL = {
  totals: { visits: 128, whatsappContacts: 34 },
  series: [{ bucket: "2026-07-06", visits: 128, whatsappContacts: 34 }],
  estadoBreakdown: [
    { estado: "pendiente" as const, count: 2 },
    { estado: "publicado" as const, count: 5 },
    { estado: "suspendido" as const, count: 1 },
  ],
  ranking: [
    { commerceId: "b", name: "Bazar", whatsappContacts: 20 },
    { commerceId: "a", name: "Aromas", whatsappContacts: 14 },
    { commerceId: "c", name: "Cafetería", whatsappContacts: 0 },
  ],
};

describe("GlobalStatsView", () => {
  it("renders the site-wide totals", () => {
    const client = new ConvexReactClientFake();
    client.registerQueryFake(api.table.adminStats.globalStats, () => FULL);

    renderWithConvex(<GlobalStatsView />, { client });

    expect(screen.getByTestId("global-stat-visitas-value").textContent).toBe(
      "128",
    );
    expect(screen.getByTestId("global-stat-whatsapp-value").textContent).toBe(
      "34",
    );
  });

  it("renders the count of Commerces per Estado", () => {
    const client = new ConvexReactClientFake();
    client.registerQueryFake(api.table.adminStats.globalStats, () => FULL);

    renderWithConvex(<GlobalStatsView />, { client });

    expect(screen.getByTestId("estado-count-pendiente").textContent).toContain(
      "2",
    );
    expect(screen.getByTestId("estado-count-publicado").textContent).toContain(
      "5",
    );
    expect(screen.getByTestId("estado-count-suspendido").textContent).toContain(
      "1",
    );
    expect(screen.getByText("Publicado")).toBeTruthy();
  });

  it("renders the WhatsApp-contacts ranking in order", () => {
    const client = new ConvexReactClientFake();
    client.registerQueryFake(api.table.adminStats.globalStats, () => FULL);

    renderWithConvex(<GlobalStatsView />, { client });

    const rows = screen
      .getByTestId("ranking-table")
      .querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("Bazar");
    expect(rows[0].textContent).toContain("20");
    expect(rows[1].textContent).toContain("Aromas");
    expect(rows[2].textContent).toContain("Cafetería");
  });

  it("re-queries with the chosen granularity when the period selector changes", async () => {
    const client = new ConvexReactClientFake();
    const fake = vi.fn((args: { granularity: string }) => ({
      ...FULL,
      totals:
        args.granularity === "month"
          ? { visits: 9, whatsappContacts: 3 }
          : FULL.totals,
    }));
    client.registerQueryFake(api.table.adminStats.globalStats, fake);

    renderWithConvex(<GlobalStatsView />, { client });

    expect(fake).toHaveBeenCalledWith({ granularity: "day" });
    expect(screen.getByTestId("global-stat-visitas-value").textContent).toBe(
      "128",
    );

    fireEvent.click(screen.getByRole("button", { name: "Mes" }));

    await waitFor(() =>
      expect(fake).toHaveBeenCalledWith({ granularity: "month" }),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("global-stat-visitas-value").textContent,
      ).toBe("9"),
    );
  });

  it("shows the evolution empty state when there are no data points", () => {
    const client = new ConvexReactClientFake();
    client.registerQueryFake(api.table.adminStats.globalStats, () => ({
      ...FULL,
      series: [],
    }));

    renderWithConvex(<GlobalStatsView />, { client });

    expect(screen.getByText("Aún no hay datos para mostrar.")).toBeTruthy();
  });
});
