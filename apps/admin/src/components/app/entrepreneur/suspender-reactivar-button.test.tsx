import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { ConvexReactClientFake, renderWithConvex } from "@packages/test-utils";
import { SuspenderReactivarButton } from "./suspender-reactivar-button";

// Toasts are fire-and-forget side effects; stub them so no Toaster is needed.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const commerceId = "cid_1" as unknown as Id<"commerces">;

describe("SuspenderReactivarButton", () => {
  it("suspends a publicado fiche through suspendMyCommerce", async () => {
    const client = new ConvexReactClientFake();
    const suspend = vi.fn(() => null);
    client.registerMutationFake(api.table.commerces.suspendMyCommerce, suspend);
    client.registerMutationFake(
      api.table.commerces.reactivateMyCommerce,
      () => null,
    );

    renderWithConvex(
      <SuspenderReactivarButton
        commerce={{ _id: commerceId, estado: "publicado" }}
      />,
      { client },
    );

    const button = screen.getByRole("button", {
      name: /suspender mi publicación/i,
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(suspend).toHaveBeenCalledWith({ commerceId }),
    );
  });

  it("reactivates a suspendido fiche through reactivateMyCommerce", async () => {
    const client = new ConvexReactClientFake();
    const reactivate = vi.fn(() => null);
    client.registerMutationFake(
      api.table.commerces.suspendMyCommerce,
      () => null,
    );
    client.registerMutationFake(
      api.table.commerces.reactivateMyCommerce,
      reactivate,
    );

    renderWithConvex(
      <SuspenderReactivarButton
        commerce={{ _id: commerceId, estado: "suspendido" }}
      />,
      { client },
    );

    const button = screen.getByRole("button", {
      name: /reactivar mi publicación/i,
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(reactivate).toHaveBeenCalledWith({ commerceId }),
    );
  });

  it("shows no transition button while the fiche is pendiente", () => {
    const client = new ConvexReactClientFake();
    client.registerMutationFake(
      api.table.commerces.suspendMyCommerce,
      () => null,
    );
    client.registerMutationFake(
      api.table.commerces.reactivateMyCommerce,
      () => null,
    );

    renderWithConvex(
      <SuspenderReactivarButton
        commerce={{ _id: commerceId, estado: "pendiente" }}
      />,
      { client },
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});
