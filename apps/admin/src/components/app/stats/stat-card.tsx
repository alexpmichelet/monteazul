import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

/**
 * A single headline metric tile — a label, an icon and a big number — shared by
 * the Estadísticas surfaces (the Entrepreneur's own fiche stats and the Super
 * admin's site-wide dashboard). The value is formatted with the `es-CO` locale,
 * matching the product's Spanish UI. `testId` anchors the value for tests.
 */
export function StatCard({
  label,
  value,
  testId,
  icon,
}: {
  label: string;
  value: number;
  testId: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardDescription>{label}</CardDescription>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p data-testid={testId} className="text-3xl font-semibold tabular-nums">
          {value.toLocaleString("es-CO")}
        </p>
      </CardContent>
    </Card>
  );
}
