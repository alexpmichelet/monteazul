"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import {
  IconBrandWhatsapp,
  IconBuildingStore,
  IconEye,
} from "@tabler/icons-react";
import { api } from "@packages/backend/convex/_generated/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ESTADO_LABELS,
  type Estado,
} from "@/components/app/commerces/estado-badge";
import {
  PERIOD_OPTIONS,
  type StatsGranularity,
} from "@/components/app/entrepreneur/granularity";
import { StatsEvolutionChart } from "@/components/app/entrepreneur/stats-evolution-chart";
import { StatCard } from "@/components/app/stats/stat-card";

/**
 * « Estadísticas globales » — the Super admin's site-wide dashboard (story #15).
 * Reserved to the `admin` role (the page lives under the AdminGuard). Shows the
 * site totals (Visitas, Contactos por WhatsApp), the number of Commerces per
 * Estado, the global evolution chart with a day/week/month period selector, and
 * the ranking of Commerces by Contactos por WhatsApp — the monetisation pitch.
 * Every number is aggregated AT READ from the Événement journal by
 * `globalStats`, reusing the same module as the entrepreneur Estadísticas, so
 * the totals reconcile with the sum of each fiche's own stats (ADR-0001). Texts
 * in Spanish.
 */
export function GlobalStatsView() {
  const [granularity, setGranularity] = React.useState<StatsGranularity>("day");
  const stats = useQuery(api.table.adminStats.globalStats, { granularity });

  const estadoBreakdown = stats?.estadoBreakdown ?? [];
  const ranking = stats?.ranking ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas globales</h1>
        <p className="text-muted-foreground text-sm">
          Actividad de todo el directorio: visitas, contactos por WhatsApp y los
          negocios más contactados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Visitas"
          value={stats?.totals.visits ?? 0}
          testId="global-stat-visitas-value"
          icon={<IconEye className="size-5" />}
        />
        <StatCard
          label="Contactos por WhatsApp"
          value={stats?.totals.whatsappContacts ?? 0}
          testId="global-stat-whatsapp-value"
          icon={<IconBrandWhatsapp className="size-5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardDescription>Negocios por estado</CardDescription>
          <span className="text-muted-foreground">
            <IconBuildingStore className="size-5" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {estadoBreakdown.map((entry) => (
              <div
                key={entry.estado}
                data-testid={`estado-count-${entry.estado}`}
                className="flex flex-col gap-1"
              >
                <span className="text-2xl font-semibold tabular-nums">
                  {entry.count.toLocaleString("es-CO")}
                </span>
                <span className="text-muted-foreground text-xs">
                  {ESTADO_LABELS[entry.estado as Estado]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Evolución</CardTitle>
            <CardDescription>
              Visitas y contactos de todo el directorio a lo largo del tiempo.
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Ranking de contactos por WhatsApp</CardTitle>
          <CardDescription>
            Negocios ordenados por número de contactos por WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats === undefined ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aún no hay negocios registrados.
            </p>
          ) : (
            <Table data-testid="ranking-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Negocio</TableHead>
                  <TableHead className="text-right">Contactos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((entry, index) => (
                  <TableRow key={entry.commerceId}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.whatsappContacts.toLocaleString("es-CO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
