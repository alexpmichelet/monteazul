"use client";

import * as React from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldError } from "@/components/ui/field";

/**
 * Structured Horario editor for the fiche form. Mirrors the domain model
 * (`packages/backend/convex/lib/horario`): either a WEEKLY schedule (`semanal`)
 * of per-day time windows — each day can hold zero, one or several windows, e.g.
 * a split lunch/dinner service — or the special « Disponible » mode (con cita
 * previa / sobre pedido). Times are held as minutes-of-day so they match the
 * backend `horario` validator exactly. Controlled component: `value`/`onChange`.
 */

export type ServiceWindow = {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  from: number; // minutes-of-day
  to: number; // minutes-of-day, from < to
};
export type HorarioSemanal = { mode: "semanal"; windows: ServiceWindow[] };
export type HorarioDisponible = { mode: "disponible"; label: string };
export type Horario = HorarioSemanal | HorarioDisponible;

const MINUTES_PER_DAY = 1440;

/** Minutes-of-day → `HH:MM` for a native time input. */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `HH:MM` → minutes-of-day (`NaN` on an empty/malformed value). */
function timeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return Number.NaN;
  return hours * 60 + mins;
}

/** The 7 day rows in es-CO display order (Monday first). `dayOfWeek` carries
 *  the JS convention (0 = Sunday … 6 = Saturday) so it matches the backend. */
const WEEK_DAYS: ReadonlyArray<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miércoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sábado" },
  { dayOfWeek: 0, label: "Domingo" },
];

/** New window a « Añadir horario » row inserts — a 9:00–17:00 default. */
const DEFAULT_NEW_WINDOW = { from: 540, to: 1020 } as const;

export const DEFAULT_HORARIO: HorarioSemanal = {
  mode: "semanal",
  windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    from: 480, // 08:00
    to: 1020, // 17:00
  })),
};

const DEFAULT_DISPONIBLE: HorarioDisponible = {
  mode: "disponible",
  label: "",
};

/**
 * Validate a Horario for submission. Returns a Spanish error message or `null`.
 * Rules for `semanal`: at least one window; each window `from < to` and within
 * the day (no cross-midnight); no two windows on the same day overlap.
 */
export function validateHorario(horario: Horario): string | null {
  if (horario.mode === "disponible") {
    return horario.label.trim().length === 0
      ? "Indica una etiqueta (ej. « con cita previa »)."
      : null;
  }

  const windows = horario.windows;
  if (windows.length === 0) {
    return "Añade al menos un horario o elige « Disponible ».";
  }
  for (const w of windows) {
    if (w.from < 0 || w.to > MINUTES_PER_DAY || w.from >= w.to) {
      return "Cada horario debe empezar antes de terminar (sin pasar la medianoche).";
    }
  }
  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      const a = windows[i];
      const b = windows[j];
      if (a.dayOfWeek === b.dayOfWeek && a.from < b.to && b.from < a.to) {
        return "Dos horarios del mismo día no pueden solaparse.";
      }
    }
  }
  return null;
}

export function HorarioEditor({
  value,
  onChange,
  error,
}: {
  value: Horario;
  onChange: (next: Horario) => void;
  error?: string | null;
}) {
  // Remember the last state of each mode so toggling back and forth keeps input.
  const lastSemanal = React.useRef<HorarioSemanal>(
    value.mode === "semanal" ? value : DEFAULT_HORARIO,
  );
  const lastDisponible = React.useRef<HorarioDisponible>(
    value.mode === "disponible" ? value : DEFAULT_DISPONIBLE,
  );

  React.useEffect(() => {
    if (value.mode === "semanal") lastSemanal.current = value;
    else lastDisponible.current = value;
  }, [value]);

  function handleModeChange(mode: string) {
    onChange(mode === "semanal" ? lastSemanal.current : lastDisponible.current);
  }

  function updateWindow(index: number, patch: Partial<ServiceWindow>) {
    if (value.mode !== "semanal") return;
    onChange({
      mode: "semanal",
      windows: value.windows.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    });
  }

  function removeWindow(index: number) {
    if (value.mode !== "semanal") return;
    onChange({
      mode: "semanal",
      windows: value.windows.filter((_, i) => i !== index),
    });
  }

  function addWindow(dayOfWeek: number) {
    if (value.mode !== "semanal") return;
    onChange({
      mode: "semanal",
      windows: [
        ...value.windows,
        { dayOfWeek, from: DEFAULT_NEW_WINDOW.from, to: DEFAULT_NEW_WINDOW.to },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-3" data-slot="horario-editor">
      <Label>Horario</Label>
      <RadioGroup
        className="flex gap-6"
        value={value.mode}
        onValueChange={handleModeChange}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="semanal" id="horario-semanal" />
          <Label htmlFor="horario-semanal" className="font-normal">
            Por horario
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="disponible" id="horario-disponible" />
          <Label htmlFor="horario-disponible" className="font-normal">
            Disponible
          </Label>
        </div>
      </RadioGroup>

      {value.mode === "semanal" ? (
        <div className="flex flex-col gap-2">
          {WEEK_DAYS.map((day) => {
            const slots = value.windows
              .map((w, index) => ({ window: w, index }))
              .filter((s) => s.window.dayOfWeek === day.dayOfWeek);
            return (
              <DayRow
                key={day.dayOfWeek}
                label={day.label}
                slots={slots}
                onAdd={() => addWindow(day.dayOfWeek)}
                onUpdate={updateWindow}
                onRemove={removeWindow}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="horario-label" className="text-xs font-normal">
            Etiqueta
          </Label>
          <Input
            id="horario-label"
            placeholder="con cita previa, sobre pedido…"
            value={value.label}
            onChange={(e) => onChange({ mode: "disponible", label: e.target.value })}
          />
        </div>
      )}

      {error && <FieldError errors={[{ message: error }]} />}
    </div>
  );
}

function DayRow({
  label,
  slots,
  onAdd,
  onUpdate,
  onRemove,
}: {
  label: string;
  slots: ReadonlyArray<{ window: ServiceWindow; index: number }>;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<ServiceWindow>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <IconPlus className="size-4" aria-hidden="true" />
          Añadir horario
        </Button>
      </div>

      {slots.length === 0 ? (
        <p className="text-muted-foreground text-xs">Cerrado</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {slots.map((s) => (
            <li key={s.index} className="flex items-center gap-2">
              <Input
                type="time"
                aria-label="Apertura"
                step={60}
                value={minutesToTime(s.window.from)}
                onChange={(e) => {
                  const m = timeToMinutes(e.target.value);
                  if (!Number.isNaN(m)) onUpdate(s.index, { from: m });
                }}
              />
              <span aria-hidden="true" className="text-muted-foreground">
                →
              </span>
              <Input
                type="time"
                aria-label="Cierre"
                step={60}
                value={minutesToTime(s.window.to)}
                onChange={(e) => {
                  const m = timeToMinutes(e.target.value);
                  if (!Number.isNaN(m)) onUpdate(s.index, { to: m });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar horario"
                onClick={() => onRemove(s.index)}
              >
                <IconTrash className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
