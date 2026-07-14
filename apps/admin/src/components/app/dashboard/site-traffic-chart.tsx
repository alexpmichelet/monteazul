"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StatsPeriod } from "@/components/app/entrepreneur/granularity";
import { formatBucketLabel } from "@/components/app/entrepreneur/granularity";

type TrafficPoint = {
  bucket: string;
  count: number;
};

const chartConfig = {
  count: {
    label: "Ingresos",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

/**
 * Evolution chart of the « Ingresos a la plataforma » card: one area of
 * site-wide unique daily visitors over the gap-filled buckets returned by
 * `globalStats.siteTraffic` (Ronda 11). Same recharts idioms as the shared
 * evolution chart (monotone spline, Y pinned at 0 — counts are never
 * negative).
 */
export function SiteTrafficChart({
  series,
  period,
}: {
  series: TrafficPoint[];
  period: StatsPeriod;
}) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <AreaChart data={series} margin={{ left: 4, right: 12 }}>
        <defs>
          <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value) => formatBucketLabel(String(value), period)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
          domain={[0, "auto"]}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                formatBucketLabel(String(value), period)
              }
              indicator="dot"
            />
          }
        />
        <Area
          dataKey="count"
          name="count"
          type="monotone"
          fill="url(#fillIngresos)"
          stroke="var(--color-count)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
