import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A single headline metric tile — a label, an icon and a big number — shared by
 * the Estadísticas surfaces (the Entrepreneur's own fiche stats and the Super
 * admin's site-wide dashboard). The value is formatted with the `es-CO` locale,
 * matching the product's Spanish UI. `testId` anchors the value for tests.
 * `accentClassName` tints the icon chip (falls back to a neutral muted chip).
 */
export function StatCard({
  label,
  value,
  testId,
  icon,
  accentClassName,
}: {
  label: string;
  value: number;
  testId: string;
  icon: React.ReactNode;
  accentClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardDescription>{label}</CardDescription>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            accentClassName ?? "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <p data-testid={testId} className="text-3xl font-semibold tabular-nums">
          {value.toLocaleString("es-CO")}
        </p>
      </CardContent>
    </Card>
  );
}
