import { describe, expect, it } from "vitest";
import {
  bogotaMinutesOfDay,
  commerceStatus,
  formatMinutes,
  type Horario,
} from "./lib/horario";

/**
 * America/Bogota is UTC-5 year-round (no DST), so a Bogota wall-clock time of
 * HH:MM corresponds to the UTC instant HH+5:MM. Each Date below is built in UTC
 * and annotated with the Bogota time it represents.
 */
const atBogota = (hour: number, minute = 0): Date =>
  new Date(Date.UTC(2026, 0, 15, (hour + 5) % 24, minute));

const plages = (from: number, to: number): Horario => ({
  mode: "plages",
  days: "Lun – Vie",
  from,
  to,
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

describe("commerceStatus — plages", () => {
  it("is abierto exactly at the opening minute (inclusive)", () => {
    const status = commerceStatus(plages(690, 900), atBogota(11, 30)); // opens 11:30
    expect(status.state).toBe("abierto");
    expect(status.short).toBe("Abierto");
    expect(status.text).toBe("Abierto ahora · cierra a las 15:00");
  });

  it("is cerrado exactly at the closing minute (exclusive)", () => {
    const status = commerceStatus(plages(690, 900), atBogota(15, 0)); // closes 15:00
    expect(status.state).toBe("cerrado");
    expect(status.short).toBe("Cerrado");
    expect(status.text).toBe("Cerrado · abre a las 11:30");
  });

  it("is abierto one minute before closing", () => {
    expect(commerceStatus(plages(690, 900), atBogota(14, 59)).state).toBe(
      "abierto",
    );
  });

  it("is cerrado one minute before opening", () => {
    const status = commerceStatus(plages(450, 960), atBogota(7, 29)); // opens 7:30
    expect(status.state).toBe("cerrado");
    expect(status.text).toBe("Cerrado · abre a las 7:30");
  });

  it("is cerrado just after midnight Bogota for a daytime schedule", () => {
    const status = commerceStatus(plages(540, 1080), atBogota(0, 30)); // 00:30 Bogota
    expect(status.state).toBe("cerrado");
  });

  it("uses Bogota time, not the host timezone, at the boundary", () => {
    // 16:59 UTC is 11:59 Bogota → before an 11:30–15:00 window closes.
    const beforeClose = commerceStatus(
      plages(690, 900),
      new Date(Date.UTC(2026, 0, 15, 16, 59)),
    );
    expect(beforeClose.state).toBe("abierto");
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
