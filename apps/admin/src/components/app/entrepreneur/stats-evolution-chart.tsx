"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StatsPeriod } from "./granularity";
import { formatBucketLabel } from "./granularity";

type SeriesPoint = {
  bucket: string;
  visits: number;
  whatsappContacts: number;
};

const chartConfig = {
  visits: {
    label: "Visitas",
    color: "var(--primary)",
  },
  whatsappContacts: {
    label: "Contactos por WhatsApp",
    // WhatsApp brand green (design.md).
    color: "#25a35a",
  },
} satisfies ChartConfig;

/**
 * Evolution chart of the Estadísticas page: two areas (Visitas + Contactos por
 * WhatsApp) over the day/week/month buckets returned by the aggregation. The
 * recharts patterns mirror the template dashboard's interactive area chart.
 */
export function StatsEvolutionChart({
  series,
  period,
}: {
  series: SeriesPoint[];
  period: StatsPeriod;
}) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <AreaChart data={series} margin={{ left: 4, right: 12 }}>
        <defs>
          <linearGradient id="fillVisitas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillWhatsapp" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-whatsappContacts)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-whatsappContacts)"
              stopOpacity={0.1}
            />
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
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="visits"
          name="visits"
          type="natural"
          fill="url(#fillVisitas)"
          stroke="var(--color-visits)"
        />
        <Area
          dataKey="whatsappContacts"
          name="whatsappContacts"
          type="natural"
          fill="url(#fillWhatsapp)"
          stroke="var(--color-whatsappContacts)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
