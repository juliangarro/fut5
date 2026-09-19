import { afterEach, describe, expect, test, vi } from "vitest";
import { hoyCR, sumarDiasCR } from "./fecha";

afterEach(() => {
  vi.useRealTimers();
});

describe("hoyCR", () => {
  // El bug D11 (plan-rediseno-dale-cancha.md): el servidor corre en UTC, y
  // Costa Rica (UTC-6) sigue en el día anterior varias horas después de la
  // medianoche UTC. hoyCR() existe justo para que esto no se rompa.
  test("sigue siendo el día anterior en CR poco después de medianoche UTC", () => {
    vi.setSystemTime(new Date("2026-09-19T02:00:00Z")); // 20:00 del 18 en CR
    expect(hoyCR()).toBe("2026-09-18");
  });

  test("ya es el día siguiente en CR pasadas las 06:00 UTC", () => {
    vi.setSystemTime(new Date("2026-09-19T06:30:00Z")); // 00:30 del 19 en CR
    expect(hoyCR()).toBe("2026-09-19");
  });

  test("coincide con UTC a media tarde", () => {
    vi.setSystemTime(new Date("2026-09-18T18:00:00Z")); // 12:00 del 18 en CR
    expect(hoyCR()).toBe("2026-09-18");
  });
});

describe("sumarDiasCR", () => {
  test("suma un día simple", () => {
    expect(sumarDiasCR("2026-09-18", 1)).toBe("2026-09-19");
  });

  test("resta un día simple", () => {
    expect(sumarDiasCR("2026-09-18", -1)).toBe("2026-09-17");
  });

  test("cruza fin de mes", () => {
    expect(sumarDiasCR("2026-09-30", 1)).toBe("2026-10-01");
  });

  test("cruza fin de año", () => {
    expect(sumarDiasCR("2025-12-31", 1)).toBe("2026-01-01");
  });

  test("con n=0 devuelve la misma fecha", () => {
    expect(sumarDiasCR("2026-09-18", 0)).toBe("2026-09-18");
  });
});
