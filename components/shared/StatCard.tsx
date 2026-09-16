import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Contrato "stat tile" de la skill dataviz: label + value + delta opcional
// (con signo, contra un período nombrado, color = dirección × si subir es
// bueno). Sin sparkline por ahora — mantiene el alcance acotado. Reusado
// en /admin/insights (período configurable, caption por defecto) y en el
// panel del admin (Fase 10, caption "vs. ayer").
export function StatCard({
  label,
  value,
  detalle,
  delta,
  subiendoEsBueno = true,
  unidadDelta = "%",
  caption = "respecto al período anterior",
}: {
  label: string;
  value: string;
  /** Subtítulo opcional en 14px, ej. "confirmados". */
  detalle?: string;
  /** Cambio vs. el período de comparación. undefined = sin comparación disponible. */
  delta?: number;
  subiendoEsBueno?: boolean;
  unidadDelta?: "%" | "pts";
  caption?: string;
}) {
  const hayDelta = delta !== undefined && Number.isFinite(delta);
  const esPositivo = hayDelta && delta! > 0;
  const esNegativo = hayDelta && delta! < 0;
  const esBueno = esPositivo === subiendoEsBueno;

  return (
    <Card className="gap-1.5 px-[22px] py-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-[30px] font-bold text-foreground">{value}</p>
      {detalle && <p className="text-sm text-neutral-800">{detalle}</p>}
      {hayDelta && (esPositivo || esNegativo) && (
        <p
          className={cn(
            "flex items-center gap-0.5 text-xs font-semibold",
            esBueno ? "text-success" : "text-terracota-800"
          )}
        >
          {esPositivo ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
          {esPositivo ? "+" : ""}
          {delta!.toFixed(0)}
          {unidadDelta === "%" ? "%" : " pts"} {caption}
        </p>
      )}
    </Card>
  );
}
