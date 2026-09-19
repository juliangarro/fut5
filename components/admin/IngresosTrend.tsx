import { formatearColones } from "@/lib/formato";

const ALTO = 140;
const ANCHO_BARRA = 24;
const GAP = 12;
const RADIO = 12;

// Camino con esquinas redondeadas solo arriba — <rect rx> redondea las 4
// esquinas, por eso se arma el <path> a mano.
function pathBarraRedondeadaArriba(x: number, y: number, w: number, h: number, r: number) {
  const radio = Math.min(r, h, w / 2);
  return `M${x},${y + radio}
    Q${x},${y} ${x + radio},${y}
    L${x + w - radio},${y}
    Q${x + w},${y} ${x + w},${y + radio}
    L${x + w},${y + h}
    L${x},${y + h}
    Z`;
}

// Color por magnitud en 4 pasos, cortado en cuartiles de max (dataviz
// secuencial de un solo hue, sobre la paleta terracota).
function clasePorMagnitud(monto: number, max: number): string {
  if (max === 0) return "fill-terracota-300";
  const frac = monto / max;
  if (frac <= 0.25) return "fill-terracota-300";
  if (frac <= 0.5) return "fill-terracota-500";
  if (frac <= 0.75) return "fill-terracota-700";
  return "fill-terracota-900";
}

export function IngresosTrend({ datos }: { datos: { etiqueta: string; monto: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.monto));
  const ancho = datos.length * (ANCHO_BARRA + GAP) + GAP;
  const total = datos.reduce((suma, d) => suma + d.monto, 0);

  if (datos.every((d) => d.monto === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay ingresos confirmados en este período.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${ancho} ${ALTO + 24}`}
        // Tamaño intrínseco fijo en vez de width="100%": con width="100%" y
        // sin height, el navegador deriva el alto del aspect ratio del
        // viewBox y lo escala hasta llenar el ancho del contenedor — en un
        // panel de admin ancho con pocas semanas de datos (`ancho` chico,
        // ej. 192px para 5 barras) esto agranda todo (barras, texto de
        // "155k", etiquetas "Sem N") varias veces, cortando valores arriba
        // y solapando etiquetas. Con tamaño fijo, el gráfico se dibuja a su
        // tamaño de diseño y `overflow-x-auto` del contenedor se encarga del
        // desborde en pantallas angostas (móvil), no al revés.
        width={ancho}
        height={ALTO + 24}
        role="img"
        aria-label={`Ingresos confirmados por semana. Total del período: ${formatearColones(total)}.`}
      >
        <line x1={0} y1={ALTO} x2={ancho} y2={ALTO} stroke="var(--border)" strokeWidth={1} />
        {datos.map((d, i) => {
          const alto = max > 0 ? (d.monto / max) * (ALTO - 8) : 0;
          const x = GAP + i * (ANCHO_BARRA + GAP);
          const altoBarra = Math.max(alto, 2);
          const y = ALTO - altoBarra;
          return (
            <g key={d.etiqueta}>
              <path d={pathBarraRedondeadaArriba(x, y, ANCHO_BARRA, altoBarra, RADIO)} className={clasePorMagnitud(d.monto, max)}>
                <title>
                  {d.etiqueta}: {formatearColones(d.monto)}
                </title>
              </path>
              {d.monto > 0 && (
                <text x={x + ANCHO_BARRA / 2} y={y - 6} textAnchor="middle" className="fill-neutral-800 text-[12px]">
                  {d.monto >= 1000 ? `${Math.round(d.monto / 1000)}k` : d.monto}
                </text>
              )}
              <text x={x + ANCHO_BARRA / 2} y={ALTO + 16} textAnchor="middle" className="fill-muted-foreground text-[13px]">
                {d.etiqueta}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
