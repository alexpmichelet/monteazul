import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Real-time opening state of a Commerce, computed from its Horario.
 * `disponible` (con cita previa / sobre pedido) reuses the open (green)
 * treatment, exactly like the Claude Design prototype.
 */
export type CommerceStatus = "abierto" | "cerrado" | "disponible";

type Tone = "open" | "closed";

const DEFAULT_LABEL: Record<CommerceStatus, string> = {
  abierto: "Abierto",
  cerrado: "Cerrado",
  disponible: "Disponible",
};

const TONE_BY_STATUS: Record<CommerceStatus, Tone> = {
  abierto: "open",
  disponible: "open",
  cerrado: "closed",
};

export type StatusBadgeProps = React.ComponentProps<"span"> & {
  status: CommerceStatus;
  /** Overrides the default Spanish label (e.g. "Abierto ahora"). */
  label?: string;
  /** White rounded pill for the card photo overlay. */
  pill?: boolean;
};

function StatusBadge({
  status,
  label,
  pill = false,
  className,
  ...props
}: StatusBadgeProps) {
  const tone = TONE_BY_STATUS[status];
  const isOpen = tone === "open";

  return (
    <span
      data-slot="status-badge"
      data-testid="status-badge"
      data-status={status}
      data-tone={tone}
      data-pill={pill}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold whitespace-nowrap",
        pill
          ? "rounded-pill bg-white/95 px-2.5 py-1 text-[10.5px] shadow-sm"
          : "text-xs",
        isOpen ? "text-status-open-text" : "text-status-closed-text",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          isOpen ? "bg-status-open-dot" : "bg-status-closed-dot",
        )}
      />
      {label ?? DEFAULT_LABEL[status]}
    </span>
  );
}

export { StatusBadge };
