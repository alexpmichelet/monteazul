import { describe, expect, it } from "vitest";
import {
  bogotaDayOfWeek,
  bogotaMinutesOfDay,
  commerceStatus,
  formatMinutes,
  weeklyScheduleRows,
  type Horario,
  type ServiceWindow,
} from "./lib/horario";

/**
 * America/Bogota is UTC-5 year-round (no DST), so a Bogota wall-clock time of
 * HH:MM corresponds to the UTC instant HH+5:MM. Each Date below is built in UTC
 * and annotated with the Bogota time it represents. 2026-01-15 is a **Thursday**
 * in Bogota (dayOfWeek 4), which the weekly windows below all include.
 */
const atBogota = (hour: number, minute = 0): Date =>
  new Date(Date.UTC(2026, 0, 15, (hour + 5) % 24, minute));

/** A weekly schedule with the same window Monday–Friday (Thursday included). */
const weekdays = (from: number, to: number): Horario => ({
  mode: "semanal",
  windows: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, from, to })),
});

const semanal = (windows: ServiceWindow[]): Horario => ({
  mode: "semanal",
  windows,
});

describe("formatMinutes", () => {
  it("formats minutes-of-day as H:MM without zero-padding the hour", () => {
    expect(formatMinutes(450)).toBe("7:30"); // 07:30
    expect(formatMinutes(900)).toBe("15:00");
    expect(formatMinutes(960)).toBe("16:00");
    expect(formatMinutes(0)).toBe("0:00");
    expect(formatMinutes(1439)).toBe("23:59");
  });
});

describe("bogotaMinutesOfDay", () => {
  it("returns the minutes-of-day in the America/Bogota reference timezone", () => {
    // 17:00 UTC is 12:00 in Bogota → 720 minutes.
    expect(bogotaMinutesOfDay(new Date(Date.UTC(2026, 0, 15, 17, 0)))).toBe(720);
    // 05:00 UTC is 00:00 in Bogota → 0 minutes (midnight boundary).
    expect(bogotaMinutesOfDay(new Date(Date.UTC(2026, 0, 15, 5, 0)))).toBe(0);
  });
});

describe("bogotaDayOfWeek", () => {
  it("returns the Bogota weekday (0 = Sunday … 6 = Saturday)", () => {
    // 2026-01-15 11:00 Bogota is a Thursday.
    expect(bogotaDayOfWeek(atBogota(11, 0))).toBe(4);
    // 23:30 UTC is 18:30 Bogota, still Thursday; 03:00 UTC is 22:00 the
    // previous day (Wednesday) in Bogota.
    expect(bogotaDayOfWeek(new Date(Date.UTC(2026, 0, 15, 3, 0)))).toBe(3);
  });
});

describe("commerceStatus — semanal", () => {
  it("is abierto exactly at the opening minute (inclusive)", () => {
    const status = commerceStatus(weekdays(690, 900), atBogota(11, 30)); // opens 11:30
    expect(status.state).toBe("abierto");
    expect(status.short).toBe("Abierto");
    expect(status.text).toBe("Abierto ahora · cierra a las 15:00");
  });

  it("is cerrado exactly at the closing minute (exclusive) → reopens next day", () => {
    const status = commerceStatus(weekdays(690, 900), atBogota(15, 0)); // closes 15:00
    expect(status.state).toBe("cerrado");
    expect(status.short).toBe("Cerrado");
    // Today's only window has already closed, so the next opening is Friday.
    expect(status.text).toBe("Cerrado · abre mañana a las 11:30");
  });

  it("is abierto one minute before closing", () => {
    expect(commerceStatus(weekdays(690, 900), atBogota(14, 59)).state).toBe(
      "abierto",
    );
  });

  it("is cerrado before today's opening and announces it for today", () => {
    const status = commerceStatus(weekdays(450, 960), atBogota(7, 29)); // opens 7:30
    expect(status.state).toBe("cerrado");
    expect(status.text).toBe("Cerrado · abre a las 7:30");
  });

  it("is cerrado just after midnight Bogota for a daytime schedule", () => {
    const status = commerceStatus(weekdays(540, 1080), atBogota(0, 30)); // 00:30 Bogota
    expect(status.state).toBe("cerrado");
  });

  it("uses Bogota time, not the host timezone, at the boundary", () => {
    // 16:59 UTC is 11:59 Bogota → before an 11:30–15:00 window closes.
    const beforeClose = commerceStatus(
      weekdays(690, 900),
      new Date(Date.UTC(2026, 0, 15, 16, 59)),
    );
    expect(beforeClose.state).toBe("abierto");
  });

  it("supports split shifts: closed between two windows of the same day", () => {
    // Thursday 8:00–12:00 and 14:00–18:00.
    const split = semanal([
      { dayOfWeek: 4, from: 480, to: 720 },
      { dayOfWeek: 4, from: 840, to: 1080 },
    ]);
    // 10:00 → inside the morning window.
    const morning = commerceStatus(split, atBogota(10, 0));
    expect(morning.state).toBe("abierto");
    expect(morning.text).toBe("Abierto ahora · cierra a las 12:00");
    // 13:00 → between the two windows: closed, reopens today at 14:00.
    const gap = commerceStatus(split, atBogota(13, 0));
    expect(gap.state).toBe("cerrado");
    expect(gap.text).toBe("Cerrado · abre a las 14:00");
  });

  it("announces a reopening several days away by weekday name", () => {
    // Only open on Monday; on Thursday the next opening is the following Monday.
    const mondayOnly = semanal([{ dayOfWeek: 1, from: 540, to: 1080 }]);
    const status = commerceStatus(mondayOnly, atBogota(12, 0));
    expect(status.state).toBe("cerrado");
    expect(status.text).toBe("Cerrado · abre el lunes a las 9:00");
  });

  it("is cerrado with no reopening text when the schedule is empty", () => {
    const status = commerceStatus({ mode: "semanal", windows: [] }, atBogota(12));
    expect(status.state).toBe("cerrado");
    expect(status.text).toBe("Cerrado");
  });
});

describe("commerceStatus — disponible", () => {
  it("reports disponible with the special label, ignoring the clock", () => {
    const horario: Horario = { mode: "disponible", label: "sobre pedido" };
    const status = commerceStatus(horario, atBogota(3, 0));
    expect(status.state).toBe("disponible");
    expect(status.short).toBe("Disponible");
    expect(status.text).toBe("Disponible · sobre pedido");
  });

  it("supports the 'con cita previa' label", () => {
    const status = commerceStatus(
      { mode: "disponible", label: "con cita previa" },
      atBogota(20, 0),
    );
    expect(status.text).toBe("Disponible · con cita previa");
  });
});

describe("weeklyScheduleRows", () => {
  it("lists all 7 days Monday-first, joining windows and marking closed days", () => {
    const rows = weeklyScheduleRows([
      { dayOfWeek: 1, from: 480, to: 720 },
      { dayOfWeek: 1, from: 840, to: 1080 },
      { dayOfWeek: 3, from: 540, to: 1020 },
    ]);
    expect(rows).toEqual([
      { day: "Lunes", hours: "8:00 – 12:00 · 14:00 – 18:00" },
      { day: "Martes", hours: "Cerrado" },
      { day: "Miércoles", hours: "9:00 – 17:00" },
      { day: "Jueves", hours: "Cerrado" },
      { day: "Viernes", hours: "Cerrado" },
      { day: "Sábado", hours: "Cerrado" },
      { day: "Domingo", hours: "Cerrado" },
    ]);
  });
});
