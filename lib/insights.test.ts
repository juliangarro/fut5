import { describe, expect, test } from "vitest";
import { rangoPeriodo } from "./insights";

describe("rangoPeriodo", () => {
  test("período de 7 días sin cruzar mes", () => {
    expect(rangoPeriodo(7, new Date("2026-09-18T15:30:00Z"))).toEqual({
      desde: "2026-09-12",
      hasta: "2026-09-18",
      anteriorDesde: "2026-09-05",
      anteriorHasta: "2026-09-11",
    });
  });

  test("período de 7 días que cruza un cambio de mes", () => {
    expect(rangoPeriodo(7, new Date("2026-09-03T00:00:00Z"))).toEqual({
      desde: "2026-08-28",
      hasta: "2026-09-03",
      anteriorDesde: "2026-08-21",
      anteriorHasta: "2026-08-27",
    });
  });

  test("período de 30 días que cruza un cambio de año", () => {
    expect(rangoPeriodo(30, new Date("2026-01-15T00:00:00Z"))).toEqual({
      desde: "2025-12-17",
      hasta: "2026-01-15",
      anteriorDesde: "2025-11-17",
      anteriorHasta: "2025-12-16",
    });
  });

  test("ignora la hora del día — usa solo la fecha civil", () => {
    const alMediodia = rangoPeriodo(7, new Date("2026-09-18T12:00:00Z"));
    const casiMedianoche = rangoPeriodo(7, new Date("2026-09-18T23:59:00Z"));
    expect(alMediodia).toEqual(casiMedianoche);
  });
});
