"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
// getDay(): 0=domingo..6=sábado -> reordenar a Lun..Dom para la grilla.
const ORDEN_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

// Rampa D10 (ver DECISIONS.md): crema (vacío) -> terracota 300/500/700/900,
// ya cargada como --chart-1..5 en globals.css (Fase 1).
const PASOS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

function pasoParaValor(valor: number, max: number) {
  if (valor === 0 || max === 0) return 0;
  const frac = valor / max;
  return Math.min(PASOS.length - 1, 1 + Math.floor(frac * (PASOS.length - 1)));
}

function diaLargo(diaJs: number): string {
  const i = ORDEN_JS_DAY.indexOf(diaJs);
  return i >= 0 ? DIAS_LARGOS[i] : "";
}

export function OcupacionHeatmap({
  datos,
}: {
  datos: { dia: number; hora: number; cantidad: number }[];
}) {
  const { horas, mapa, max, lectura } = useMemo(() => {
    const mapa = new Map<string, number>();
    let min = 23;
    let maxHora = 0;
    let max = 0;
    for (const punto of datos) {
      mapa.set(`${punto.dia}-${punto.hora}`, punto.cantidad);
      min = Math.min(min, punto.hora);
      maxHora = Math.max(maxHora, punto.hora);
      max = Math.max(max, punto.cantidad);
    }
    if (datos.length === 0) {
      min = 14;
      maxHora = 22;
    }
    const horas = Array.from({ length: maxHora - min + 1 }, (_, i) => min + i);

    // Línea de lectura calculada, nunca fija: solo si hay un único ganador
    // claro (sin empate) y con al menos 5 reservas de señal.
    const ganadores = datos.filter((p) => p.cantidad === max && max > 0);
    const lectura =
      max >= 5 && ganadores.length === 1
        ? `Tu franja más pedida es el ${diaLargo(ganadores[0].dia)} a las ${ganadores[0].hora}:00.`
        : null;

    return { horas, mapa, max, lectura };
  }, [datos]);

  if (datos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay reservas confirmadas en este período para armar el mapa de calor.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>menos</span>
        {PASOS.map((paso) => (
          <span key={paso} className={cn("size-3 rounded-[3px]", paso, paso === "bg-chart-1" && "ring-1 ring-border")} />
        ))}
        <span>más</span>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid w-full gap-[5px]"
          style={{ gridTemplateColumns: `auto repeat(${horas.length}, 1fr)` }}
        >
          <div />
          {horas.map((h) => (
            <div key={h} className="text-center text-[12px] text-muted-foreground">
              {h}
            </div>
          ))}
          {ORDEN_JS_DAY.map((diaJs, i) => (
            <div key={diaJs} className="contents">
              <div className="flex items-center pr-2 text-[13px] text-muted-foreground">{DIAS_CORTOS[i]}</div>
              {horas.map((h) => {
                const cantidad = mapa.get(`${diaJs}-${h}`) ?? 0;
                const paso = pasoParaValor(cantidad, max);
                return (
                  <div
                    key={h}
                    title={`${DIAS_CORTOS[i]} ${h}:00 — ${cantidad} reserva${cantidad === 1 ? "" : "s"}`}
                    aria-label={`${diaLargo(diaJs)} ${h}:00: ${cantidad} reserva${cantidad === 1 ? "" : "s"}`}
                    className={cn("h-[30px] rounded-celda", PASOS[paso], paso === 0 && "ring-1 ring-border")}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {lectura && <p className="text-sm text-neutral-800">{lectura}</p>}
    </div>
  );
}
