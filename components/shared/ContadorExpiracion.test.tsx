import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContadorExpiracion } from "./ContadorExpiracion";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ContadorExpiracion", () => {
  test("sin expiraAt no renderiza nada", () => {
    const { container } = render(<ContadorExpiracion expiraAt={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("muestra los minutos restantes, formato largo por defecto", () => {
    vi.setSystemTime(new Date("2026-09-18T18:00:00Z"));
    render(<ContadorExpiracion expiraAt="2026-09-18T18:15:00Z" />);
    expect(screen.getByText("vence en 15 min")).toBeInTheDocument();
  });

  test("formato corto usa mayúscula inicial", () => {
    vi.setSystemTime(new Date("2026-09-18T18:00:00Z"));
    render(<ContadorExpiracion expiraAt="2026-09-18T18:15:00Z" formato="corto" />);
    expect(screen.getByText("Vence en 15 min")).toBeInTheDocument();
  });

  test("al llegar a cero (o pasarse) muestra 'Venciendo…'", () => {
    vi.setSystemTime(new Date("2026-09-18T18:00:00Z"));
    render(<ContadorExpiracion expiraAt="2026-09-18T17:59:00Z" />);
    expect(screen.getByText("Venciendo…")).toBeInTheDocument();
  });

  test("se actualiza solo con el tiempo, sin re-render externo", () => {
    vi.setSystemTime(new Date("2026-09-18T18:00:00Z"));
    // A 40s: round(40s/60) = 1 min. Un solo tick de 15s (el intervalo del
    // componente) lo deja en 25s restantes: round(25s/60) = 0 -> vencido.
    // `advanceTimersByTime` mueve el reloj fake y el `Date.now()` interno
    // del componente junto con los timers, sin necesitar otro setSystemTime.
    render(<ContadorExpiracion expiraAt="2026-09-18T18:00:40Z" />);
    expect(screen.getByText("vence en 1 min")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(15_000); // el componente refresca cada 15s
    });

    expect(screen.getByText("Venciendo…")).toBeInTheDocument();
  });
});
