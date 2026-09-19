import { describe, expect, test } from "vitest";
import {
  formatearColones,
  formatearFechaLarga,
  formatearDiaCorto,
  formatearHora,
  formatearHoraDeTimestamp,
  formatearRangoHoras,
  iniciales,
} from "./formato";

describe("formatearColones", () => {
  test("usa punto de miles, sin decimales", () => {
    expect(formatearColones(14000)).toBe("₡14.000");
  });

  test("monto sin miles", () => {
    expect(formatearColones(500)).toBe("₡500");
  });

  test("monto en millones", () => {
    expect(formatearColones(1250000)).toBe("₡1.250.000");
  });
});

describe("formatearFechaLarga", () => {
  test("fecha YYYY-MM-DD se interpreta como fecha civil, no como instante UTC", () => {
    // Si se interpretara `new Date("2026-09-16")` como medianoche UTC sin
    // anclar a mediodía, en hora de Costa Rica (UTC-6) caería el 15 en la
    // tarde — el mismo bug D11 documentado en el archivo.
    expect(formatearFechaLarga("2026-09-16")).toBe("miércoles 16 de setiembre");
  });

  test("corrige 'septiembre' de Intl a 'setiembre' (uso local costarricense)", () => {
    expect(formatearFechaLarga("2026-09-20")).toContain("setiembre");
  });
});

describe("formatearDiaCorto", () => {
  test("la fecha de hoy se muestra como 'hoy'", () => {
    expect(formatearDiaCorto("2026-09-18", "2026-09-18")).toBe("hoy");
  });

  test("la fecha de mañana se muestra como 'mañana'", () => {
    expect(formatearDiaCorto("2026-09-19", "2026-09-18")).toBe("mañana");
  });

  test("mañana cruzando fin de mes también se detecta", () => {
    expect(formatearDiaCorto("2026-10-01", "2026-09-30")).toBe("mañana");
  });

  test("una fecha más lejana muestra día corto y número", () => {
    expect(formatearDiaCorto("2026-09-25", "2026-09-18")).toBe("vie 25");
  });
});

describe("formatearHora / formatearRangoHoras", () => {
  test("recorta segundos de una hora HH:MM:SS", () => {
    expect(formatearHora("18:00:00")).toBe("18:00");
  });

  test("deja HH:MM intacto", () => {
    expect(formatearHora("18:00")).toBe("18:00");
  });

  test("arma un rango con el separador en dash", () => {
    expect(formatearRangoHoras("18:00:00", "19:00:00")).toBe("18:00–19:00");
  });
});

describe("formatearHoraDeTimestamp", () => {
  test("convierte un timestamp UTC a hora de Costa Rica (UTC-6)", () => {
    expect(formatearHoraDeTimestamp("2026-09-18T20:00:00Z")).toBe("14:00");
  });

  test("cruza medianoche CR sin cambiar de día en el resultado (solo hora)", () => {
    // 2026-09-19T04:30:00Z = 2026-09-18T22:30 en CR
    expect(formatearHoraDeTimestamp("2026-09-19T04:30:00Z")).toBe("22:30");
  });
});

describe("iniciales", () => {
  test("nombre y apellido -> dos letras", () => {
    expect(iniciales("Julián Garro")).toBe("JG");
  });

  test("nombre con varios apellidos usa el primero y el último", () => {
    expect(iniciales("Julián García Garro")).toBe("JG");
  });

  test("un solo nombre -> primeras dos letras", () => {
    expect(iniciales("Julián")).toBe("JU");
  });

  test("string vacío -> string vacío", () => {
    expect(iniciales("")).toBe("");
  });

  test("espacios extra no rompen el cálculo", () => {
    expect(iniciales("  Julián   Garro  ")).toBe("JG");
  });
});
