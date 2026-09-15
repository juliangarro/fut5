import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcularInsights, PERIODOS, type PeriodoKey } from "@/lib/insights";
import { StatCard } from "@/components/shared/StatCard";
import { OcupacionHeatmap } from "@/components/admin/OcupacionHeatmap";
import { IngresosTrend } from "@/components/admin/IngresosTrend";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ETIQUETAS_PERIODO: Record<PeriodoKey, string> = {
  "7": "7 días",
  "30": "30 días",
  "90": "90 días",
};

function calcularDelta(actual: number, anterior: number): number | undefined {
  if (anterior === 0) return actual > 0 ? 100 : undefined;
  return ((actual - anterior) / anterior) * 100;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const periodoKey: PeriodoKey = periodo === "7" || periodo === "90" ? periodo : "30";
  const dias = PERIODOS[periodoKey];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: canchas } = await supabase.from("canchas").select("id").eq("admin_id", user.id);
  const canchaIds = (canchas ?? []).map((c) => c.id);

  const datos = await calcularInsights(supabase, canchaIds, dias);
  const deltaIngresos = calcularDelta(datos.ingresos, datos.ingresosPeriodoAnterior);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Estadísticas</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {(Object.keys(PERIODOS) as PeriodoKey[]).map((key) => (
              <Link
                key={key}
                href={`/admin/insights?periodo=${key}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  key === periodoKey
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ETIQUETAS_PERIODO[key]}
              </Link>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/api/insights/exportar?periodo=${periodoKey}`} />}
          >
            <Download />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Ingresos confirmados"
          value={`₡${datos.ingresos.toLocaleString("es-CR")}`}
          delta={deltaIngresos}
        />
        <StatCard label="Ocupación" value={`${datos.ocupacionPct.toFixed(0)}%`} />
        <StatCard
          label="Tasa de cancelación"
          value={`${datos.tasaCancelacionPct.toFixed(0)}%`}
          subiendoEsBueno={false}
        />
        <StatCard
          label="Rating promedio"
          value={datos.ratingPromedio !== null ? datos.ratingPromedio.toFixed(1) : "—"}
        />
      </div>

      <Card className="gap-3 px-4">
        <h2 className="font-medium">Ocupación por día y hora</h2>
        <OcupacionHeatmap datos={datos.heatmap} />
      </Card>

      <Card className="gap-3 px-4">
        <h2 className="font-medium">Ingresos por semana</h2>
        <IngresosTrend datos={datos.ingresosPorSemana} />
      </Card>

      <Card className="gap-3 px-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Clientes recurrentes</h2>
          {datos.proporcionRecurrentesPct !== null && (
            <span className="text-sm text-muted-foreground">
              {datos.proporcionRecurrentesPct.toFixed(0)}% recurrentes en este período
            </span>
          )}
        </div>
        {datos.clientesTop.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todavía no hay clientes con reservas confirmadas en este período.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {datos.clientesTop.map((c) => (
              <li key={c.futboleroId} className="flex items-center justify-between py-2 text-sm">
                <span>{c.nombre}</span>
                <span className="text-muted-foreground">
                  {c.reservasConfirmadas} reserva{c.reservasConfirmadas > 1 ? "s" : ""} confirmada
                  {c.reservasConfirmadas > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
