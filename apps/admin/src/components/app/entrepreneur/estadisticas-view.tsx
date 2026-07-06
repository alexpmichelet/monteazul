"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { IconEye, IconBrandWhatsapp } from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  PERIOD_OPTIONS,
  type StatsGranularity,
} from "@/components/app/entrepreneur/granularity";
import { StatsEvolutionChart } from "@/components/app/entrepreneur/stats-evolution-chart";

function StatCard({
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
        <p
          data-testid={testId}
          className="text-3xl font-semibold tabular-nums"
        >
          {value.toLocaleString("es-CO")}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * « Estadísticas » — the Entrepreneur's statistics for the fiche they own.
 * Totals cards (« Visitas », « Contactos por WhatsApp ») plus an evolution chart
 * with a day/week/month period selector. Every metric is aggregated AT READ from
 * the Événement journal by `statsForCommerce` (ADR-0001); the query is guarded so
 * an Entrepreneur only ever sees their OWN fiche's stats. All texts in Spanish.
 */
export function EstadisticasView({
  commerceId,
}: {
  commerceId: Id<"commerces">;
}) {
  const [granularity, setGranularity] = React.useState<StatsGranularity>("day");
  const stats = useQuery(api.table.events.statsForCommerce, {
    commerceId,
    granularity,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas</h1>
        <p className="text-muted-foreground text-sm">
          Visitas y contactos por WhatsApp de tu negocio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Visitas"
          value={stats?.totals.visits ?? 0}
          testId="stat-visitas-value"
          icon={<IconEye className="size-5" />}
        />
        <StatCard
          label="Contactos por WhatsApp"
          value={stats?.totals.whatsappContacts ?? 0}
          testId="stat-whatsapp-value"
          icon={<IconBrandWhatsapp className="size-5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Evolución</CardTitle>
            <CardDescription>
              Visitas y contactos a lo largo del tiempo.
            </CardDescription>
          </div>
          <div
            role="group"
            aria-label="Período"
            className="flex items-center gap-1"
          >
            {PERIOD_OPTIONS.map((option) => {
              const active = option.value === granularity;
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => setGranularity(option.value)}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {stats === undefined ? (
            <div className="flex h-[260px] items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : stats.series.length === 0 ? (
            <div
              className={cn(
                "flex h-[260px] items-center justify-center text-center",
                "text-muted-foreground text-sm",
              )}
            >
              Aún no hay datos para mostrar.
            </div>
          ) : (
            <StatsEvolutionChart
              series={stats.series}
              granularity={granularity}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
