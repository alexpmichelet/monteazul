import { describe, expect, test } from "vitest";
import { ESTADOS, type Estado } from "./commerce";
import {
  ALLOWED_TRANSITIONS,
  ESTADO_ACTIONS,
  EstadoTransitionError,
  type EstadoAction,
  canTransition,
  estadoAfter,
} from "./approval";

/**
 * Exhaustive tests of the Estado state machine (module `approval`). The allowed
 * transitions per CONTEXT.md are:
 *   - approve:    pendiente  → publicado
 *   - suspend:    publicado  → suspendido
 *   - reactivate: suspendido → publicado
 * Every other (from → to) is rejected. Deletion is not a transition and editing
 * never changes the Estado — neither is expressible here, they are enforced by
 * the admin mutations (see adminCommerces.test.ts).
 */

const ACTIONS: EstadoAction[] = ["approve", "suspend", "reactivate"];

// The single source of truth this suite checks the machine against.
const EXPECTED_ACTIONS: Record<EstadoAction, { from: Estado; to: Estado }> = {
  approve: { from: "pendiente", to: "publicado" },
  suspend: { from: "publicado", to: "suspendido" },
  reactivate: { from: "suspendido", to: "publicado" },
};

describe("ESTADO_ACTIONS", () => {
  test("maps each admin action to its exact (from → to) rule", () => {
    expect(ESTADO_ACTIONS).toEqual(EXPECTED_ACTIONS);
  });

  test("only sources/targets valid estados", () => {
    for (const { from, to } of Object.values(ESTADO_ACTIONS)) {
      expect(ESTADOS).toContain(from);
      expect(ESTADOS).toContain(to);
    }
  });
});

describe("ALLOWED_TRANSITIONS", () => {
  test("is exactly the three allowed transitions", () => {
    const pairs = ALLOWED_TRANSITIONS.map((t) => `${t.from}->${t.to}`).sort();
    expect(pairs).toEqual(
      ["pendiente->publicado", "publicado->suspendido", "suspendido->publicado"].sort(),
    );
  });
});

describe("estadoAfter", () => {
  // Exhaustive: every (estado, action) combination — 3 × 3 = 9 cases.
  for (const from of ESTADOS) {
    for (const action of ACTIONS) {
      const rule = EXPECTED_ACTIONS[action];
      if (from === rule.from) {
        test(`${action} from ${from} → ${rule.to}`, () => {
          expect(estadoAfter(from, action)).toBe(rule.to);
        });
      } else {
        test(`${action} from ${from} is rejected`, () => {
          expect(() => estadoAfter(from, action)).toThrow(EstadoTransitionError);
        });
      }
    }
  }

  test("EstadoTransitionError carries the offending estado and action", () => {
    try {
      estadoAfter("pendiente", "suspend");
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EstadoTransitionError);
      const typed = error as EstadoTransitionError;
      expect(typed.from).toBe("pendiente");
      expect(typed.action).toBe("suspend");
    }
  });
});

describe("canTransition", () => {
  // Exhaustive over every ordered pair of estados (incl. self-transitions).
  for (const from of ESTADOS) {
    for (const to of ESTADOS) {
      const allowed =
        (from === "pendiente" && to === "publicado") ||
        (from === "publicado" && to === "suspendido") ||
        (from === "suspendido" && to === "publicado");
      test(`${from} → ${to} is ${allowed ? "allowed" : "rejected"}`, () => {
        expect(canTransition(from, to)).toBe(allowed);
      });
    }
  }

  test("rejects every self-transition", () => {
    for (const estado of ESTADOS) {
      expect(canTransition(estado, estado)).toBe(false);
    }
  });
});
