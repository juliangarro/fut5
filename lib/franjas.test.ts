import { describe, expect, test } from "vitest";
import { franjaDeHora, calcularFranjaMasPedida } from "./franjas";

describe("franjaDeHora", () => {
  test.each([
    ["06:00", "manana"],
    ["11:59", "manana"],
    ["12:00", "tarde"],
    ["17:59", "tarde"],
    ["18:00", "noche"],
    ["23:00", "noche"],
  ] as const)("%s -> %s", (hora, esperado) => {
    expect(franjaDeHora(hora)).toBe(esperado);
  });
});

describe("calcularFranjaMasPedida", () => {
  test("sin slots no hay franja", () => {
    expect(calcularFranjaMasPedida([])).toBeNull();
  });

  test("ninguna franja llega al mínimo de 3 ocupados", () => {
    const slots = [
      { hora_inicio: "19:00", estado: "reservado" as const },
      { hora_inicio: "20:00", estado: "retenido" as const },
    ];
    expect(calcularFranjaMasPedida(slots)).toBeNull();
  });

  test("una franja con 3 ocupados y proporción mayor gana", () => {
    const slots = [
      // noche: 3/3 ocupados (100%)
      { hora_inicio: "18:00", estado: "reservado" as const },
      { hora_inicio: "19:00", estado: "reservado" as const },
      { hora_inicio: "20:00", estado: "reservado" as const },
      // tarde: 3/4 ocupados (75%)
      { hora_inicio: "13:00", estado: "reservado" as const },
      { hora_inicio: "14:00", estado: "reservado" as const },
      { hora_inicio: "15:00", estado: "reservado" as const },
      { hora_inicio: "16:00", estado: "disponible" as const },
    ];
    expect(calcularFranjaMasPedida(slots)).toBe("noche");
  });

  test("empate en la proporción máxima no da ganador", () => {
    const slots = [
      // noche: 3/3 (100%)
      { hora_inicio: "18:00", estado: "reservado" as const },
      { hora_inicio: "19:00", estado: "reservado" as const },
      { hora_inicio: "20:00", estado: "reservado" as const },
      // tarde: 3/3 (100%) — mismo % que noche, ninguna gana
      { hora_inicio: "13:00", estado: "reservado" as const },
      { hora_inicio: "14:00", estado: "reservado" as const },
      { hora_inicio: "15:00", estado: "reservado" as const },
    ];
    expect(calcularFranjaMasPedida(slots)).toBeNull();
  });

  test("bloqueado no cuenta como ocupado", () => {
    const slots = [
      { hora_inicio: "18:00", estado: "bloqueado" as const },
      { hora_inicio: "19:00", estado: "bloqueado" as const },
      { hora_inicio: "20:00", estado: "bloqueado" as const },
    ];
    expect(calcularFranjaMasPedida(slots)).toBeNull();
  });
});
