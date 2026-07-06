import type { Estado } from "./commerce";

/**
 * The Estado state machine — module `approval` (see the glossary in
 * `packages/backend/CONTEXT.md`).
 *
 * A Commerce moves through its lifecycle only via the three admin actions below,
 * each valid from exactly one source Estado:
 *
 *   - approve:    pendiente  → publicado   (a Super admin approves a submission)
 *   - suspend:    publicado  → suspendido  (hidden on purpose, no re-approval)
 *   - reactivate: suspendido → publicado   (back online, no re-approval)
 *
 * Every other transition is rejected. Two rules live OUTSIDE this machine, in
 * the admin mutations that use it:
 *   - deletion is possible from ANY Estado (definitive removal, not a
 *     transition);
 *   - editing a fiche NEVER changes its Estado (a-posteriori moderation).
 *
 * The module is pure (no Convex dependency) so the transition table can be
 * unit-tested exhaustively (see `approval.test.ts`).
 */

/** The admin actions that drive an Estado transition. */
export type EstadoAction = "approve" | "suspend" | "reactivate";

/** Each action's (from → to) rule — the single source of truth of the machine. */
export const ESTADO_ACTIONS: Record<
  EstadoAction,
  { from: Estado; to: Estado }
> = {
  approve: { from: "pendiente", to: "publicado" },
  suspend: { from: "publicado", to: "suspendido" },
  reactivate: { from: "suspendido", to: "publicado" },
};

/** The allowed (from → to) transitions, derived from `ESTADO_ACTIONS`. */
export const ALLOWED_TRANSITIONS: ReadonlyArray<{
  action: EstadoAction;
  from: Estado;
  to: Estado;
}> = (
  Object.entries(ESTADO_ACTIONS) as [
    EstadoAction,
    { from: Estado; to: Estado },
  ][]
).map(([action, rule]) => ({ action, from: rule.from, to: rule.to }));

/**
 * Thrown when an admin action is applied to a fiche whose current Estado does
 * not allow it. Carries the offending Estado and action for the caller to
 * surface (the admin mutations wrap it in a Spanish `ConvexError`).
 */
export class EstadoTransitionError extends Error {
  constructor(
    public readonly from: Estado,
    public readonly action: EstadoAction,
  ) {
    super(
      `Transición no permitida: no se puede «${action}» un negocio en estado «${from}».`,
    );
    this.name = "EstadoTransitionError";
  }
}

/** True iff `from → to` is one of the allowed transitions (self-transitions excluded). */
export function canTransition(from: Estado, to: Estado): boolean {
  return ALLOWED_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/**
 * Resolve the Estado a fiche reaches when `action` is applied from `current`,
 * or throw `EstadoTransitionError` when the action is not valid from `current`.
 */
export function estadoAfter(current: Estado, action: EstadoAction): Estado {
  const rule = ESTADO_ACTIONS[action];
  if (current !== rule.from) {
    throw new EstadoTransitionError(current, action);
  }
  return rule.to;
}
