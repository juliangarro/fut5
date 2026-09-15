import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Contrato "stat tile" de la skill dataviz: label + value + delta opcional
// (con signo, contra un período nombrado, color = dirección × si subir es
// bueno). Sin sparkline por ahora — mantiene el alcance acotado.
export function StatCard({
  label,
  value,
  delta,
  subiendoEsBueno = true,
}: {
  label: string;
  value: string;
  /** % de cambio vs el período anterior. undefined = sin comparación disponible. */
  delta?: number;
  subiendoEsBueno?: boolean;
}) {
  const hayDelta = delta !== undefined && Number.isFinite(delta);
  const esPositivo = hayDelta && delta > 0;
  const esNegativo = hayDelta && delta < 0;
  const esBueno = esPositivo === subiendoEsBueno;

  return (
    <Card className="gap-1 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {hayDelta && (esPositivo || esNegativo) && (
        <p
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            esBueno ? "text-success" : "text-danger"
          )}
        >
          {esPositivo ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
          {Math.abs(delta!).toFixed(0)}% respecto al período anterior
        </p>
      )}
    </Card>
  );
}
