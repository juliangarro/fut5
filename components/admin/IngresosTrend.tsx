const ALTO = 140;
const ANCHO_BARRA = 24;
const GAP = 12;

export function IngresosTrend({ datos }: { datos: { etiqueta: string; monto: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.monto));
  const ancho = datos.length * (ANCHO_BARRA + GAP) + GAP;

  if (datos.every((d) => d.monto === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay ingresos confirmados en este período.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg width={ancho} height={ALTO + 24} role="img" aria-label="Ingresos confirmados por semana">
        <line x1={0} y1={ALTO} x2={ancho} y2={ALTO} stroke="var(--border)" strokeWidth={1} />
        {datos.map((d, i) => {
          const alto = max > 0 ? (d.monto / max) * (ALTO - 8) : 0;
          const x = GAP + i * (ANCHO_BARRA + GAP);
          const y = ALTO - alto;
          return (
            <g key={d.etiqueta}>
              <rect
                x={x}
                y={y}
                width={ANCHO_BARRA}
                height={Math.max(alto, 2)}
                rx={4}
                className="fill-primary"
              >
                <title>
                  {d.etiqueta}: ₡{d.monto.toLocaleString("es-CR")}
                </title>
              </rect>
              {d.monto > 0 && (
                <text
                  x={x + ANCHO_BARRA / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {d.monto >= 1000 ? `${Math.round(d.monto / 1000)}k` : d.monto}
                </text>
              )}
              <text
                x={x + ANCHO_BARRA / 2}
                y={ALTO + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {d.etiqueta}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
