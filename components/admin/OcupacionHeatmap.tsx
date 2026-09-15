"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// getDay(): 0=domingo..6=sábado -> reordenar a Lun..Dom para la grilla.
const ORDEN_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

// Sequential (dataviz skill: una sola familia de color, claro->oscuro según
// magnitud) — pasos sobre el verde primario de la app, no una paleta
// categórica (esta sí necesitaría el validador; un solo hue no).
const PASOS_INTENSIDAD = [
  "bg-muted",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/65",
  "bg-primary",
];

function pasoParaValor(valor: number, max: number) {
  if (valor === 0 || max === 0) return 0;
  const frac = valor / max;
  return Math.min(PASOS_INTENSIDAD.length - 1, 1 + Math.floor(frac * (PASOS_INTENSIDAD.length - 1)));
}

export function OcupacionHeatmap({
  datos,
}: {
  datos: { dia: number; hora: number; cantidad: number }[];
}) {
  const { horas, mapa, max } = useMemo(() => {
    const mapa = new Map<string, number>();
    let min = 23;
    let maxHora = 0;
    let max = 0;
    for (const { dia, hora, cantidad } of datos) {
      mapa.set(`${dia}-${hora}`, cantidad);
      min = Math.min(min, hora);
      maxHora = Math.max(maxHora, hora);
      max = Math.max(max, cantidad);
    }
    if (datos.length === 0) {
      min = 14;
      maxHora = 22;
    }
    const horas = Array.from({ length: maxHora - min + 1 }, (_, i) => min + i);
    return { horas, mapa, max };
  }, [datos]);

  if (datos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay reservas confirmadas en este período para armar el mapa de calor.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${horas.length}, 1.75rem)` }}>
        <div />
        {horas.map((h) => (
          <div key={h} className="text-center text-[10px] text-muted-foreground">
            {h}
          </div>
        ))}
        {ORDEN_JS_DAY.map((diaJs, i) => (
          <div key={diaJs} className="contents">
            <div className="pr-2 text-right text-xs text-muted-foreground">{DIAS[i]}</div>
            {horas.map((h) => {
              const cantidad = mapa.get(`${diaJs}-${h}`) ?? 0;
              const paso = pasoParaValor(cantidad, max);
              return (
                <div
                  key={h}
                  title={cantidad > 0 ? `${DIAS[i]} ${h}:00 — ${cantidad} reserva${cantidad > 1 ? "s" : ""}` : undefined}
                  className={cn("size-7 rounded-sm", PASOS_INTENSIDAD[paso])}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
