import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcularInsights, PERIODOS, type PeriodoKey } from "@/lib/insights";
import { StatCard } from "@/components/shared/StatCard";
import { OcupacionHeatmap } from "@/components/admin/OcupacionHeatmap";
import { IngresosTrend } from "@/components/admin/IngresosTrend";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatearColones } from "@/lib/formato";
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
    <div className="flex flex-col gap-6 px-[22px] pt-[52px] pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] font-bold">Estadísticas</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[5px] rounded-full bg-card p-[5px]">
            {(Object.keys(PERIODOS) as PeriodoKey[]).map((key) => (
              <Link
                key={key}
                href={`/admin/insights?periodo=${key}`}
                aria-current={key === periodoKey ? "true" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-full px-4 text-sm font-semibold",
                  key === periodoKey ? "bg-primary text-primary-foreground" : "text-foreground"
                )}
              >
                {ETIQUETAS_PERIODO[key]}
              </Link>
            ))}
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/api/insights/exportar?periodo=${periodoKey}`} />}
          >
            <Download />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Ingresos confirmados"
          value={formatearColones(datos.ingresos)}
          delta={deltaIngresos}
        />
        <StatCard
          label="Ocupación"
          value={`${datos.ocupacionPct.toFixed(0)}%`}
          detalle="de los horarios publicados"
        />
        <StatCard
          label="Tasa de cancelación"
          value={`${datos.tasaCancelacionPct.toFixed(0)}%`}
          subiendoEsBueno={false}
        />
        <StatCard
          label="Rating promedio"
          value={datos.ratingPromedio !== null ? datos.ratingPromedio.toFixed(1) : "—"}
          detalle={datos.totalCalificaciones > 0 ? `${datos.totalCalificaciones} calificaciones` : undefined}
        />
      </div>

      <Card className="gap-4 px-6 py-[22px]">
        <h2 className="text-[19px] font-bold">Ocupación por día y hora</h2>
        <OcupacionHeatmap datos={datos.heatmap} />
      </Card>

      <Card className="gap-4 px-6 py-[22px]">
        <h2 className="text-[19px] font-bold">Ingresos por semana</h2>
        <IngresosTrend datos={datos.ingresosPorSemana} />
      </Card>

      <Card className="gap-4 px-6 py-[22px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-bold">Clientes recurrentes</h2>
          {datos.proporcionRecurrentesPct !== null && (
            <span className="text-sm text-muted-foreground">
              {datos.proporcionRecurrentesPct.toFixed(0)}% del período
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
              <li key={c.futboleroId} className="flex items-center justify-between py-2.5 text-[15px]">
                <span>{c.nombre}</span>
                <span className="text-muted-foreground">
                  {c.reservasConfirmadas} confirmada{c.reservasConfirmadas > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
