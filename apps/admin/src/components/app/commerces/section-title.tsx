import * as React from "react";

import { cn } from "@/lib/utils";
import { CardTitle } from "@/components/ui/card";

/**
 * A card title with a coloured icon chip, so each form section reads at a
 * glance. Shared by every sectioned fiche form (« Mi negocio », the fiche
 * wizard) so the section design never drifts between surfaces.
 */
export function SectionTitle({
  icon: Icon,
  accent,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <CardTitle className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          accent,
        )}
      >
        <Icon className="size-4" />
      </span>
      {children}
    </CardTitle>
  );
}
