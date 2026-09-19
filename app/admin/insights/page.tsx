import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcularInsights, PERIODOS, type PeriodoKey } from "@/lib/insights";
import { calcularInsightsPro } from "@/lib/insightsPro";
import { nivelDeAcceso } from "@/lib/suscripciones";
import { StatCard } from "@/components/shared/StatCard";
import { OcupacionHeatmap } from "@/components/admin/OcupacionHeatmap";
import { IngresosTrend } from "@/components/admin/IngresosTrend";
import { Aviso } from "@/components/shared/Aviso";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatearColones } from "@/lib/formato";
import { cn } from "@/lib/utils";

const ETIQUETAS_PERIODO: Record<PeriodoKey, string> = {
  "7": "7 días",
  "30": "30 días",
  "90": "90 días",
};

// getDay(): 0=domingo..6=sábado — mismo orden que usan lib/insights.ts
// (heatmap) y lib/insightsPro.ts (tendenciasDemanda).
const DIAS_LARGOS_DOM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

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

  // Insights Pro (plan-monetizacion-admin.md sección 2/3): el dashboard
  // base de arriba es gratis para todos — esto es lo único gateado detrás
  // de nivelDeAcceso. Sin fila en `suscripciones` = 'gratis', mismo
  // criterio que el resto del gating (lib/suscripciones.ts).
  const nivel = await nivelDeAcceso(supabase, user.id);
  const esPro = nivel !== "gratis";
  const datosPro = esPro ? await calcularInsightsPro(supabase, canchaIds, dias) : null;

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

      {!esPro && (
        <Card className="gap-2 px-6 py-[22px]">
          <div className="flex items-center gap-2">
            <Lock className="size-[18px] text-muted-foreground" />
            <h2 className="text-[19px] font-bold">Insights Pro</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Horario más rentable, comparación anónima con el promedio de la plataforma, alertas
            proactivas (comprobantes demorados, caídas de ocupación) y predicción simple de demanda —
            disponible en el tier Pro.
          </p>
        </Card>
      )}

      {datosPro && (
        <>
          {datosPro.comprobantesDemorados > 0 && (
            <Aviso tono="atencion">
              {datosPro.comprobantesDemorados} comprobante
              {datosPro.comprobantesDemorados > 1 ? "s" : ""} llevan más de 20 minutos sin validar.
            </Aviso>
          )}

          {datosPro.alertaOcupacion && (
            <Aviso tono="atencion">
              Tu ocupación bajó {datosPro.alertaOcupacion.caidaPct.toFixed(0)} puntos esta semana (
              {datosPro.alertaOcupacion.actualPct.toFixed(0)}% vs.{" "}
              {datosPro.alertaOcupacion.anteriorPct.toFixed(0)}% la semana pasada).
            </Aviso>
          )}

          <Card className="gap-4 px-6 py-[22px]">
            <h2 className="text-[19px] font-bold">Ingreso por franja horaria</h2>
            <IngresosTrend datos={datosPro.ingresoPorHora} />
            {datosPro.horaMasRentable && (
              <p className="text-sm text-neutral-800">
                Tu franja más rentable es {datosPro.horaMasRentable.hora}:00, con{" "}
                {formatearColones(datosPro.horaMasRentable.ingresos)} en el período.
              </p>
            )}
            {datosPro.horaMenosOcupada && (
              <p className="text-sm text-neutral-800">
                {datosPro.horaMenosOcupada.hora}:00 es tu franja con menos ocupación (
                {datosPro.horaMenosOcupada.ocupacionPct.toFixed(0)}%) — candidata a bajar de precio para
                llenarla.
              </p>
            )}
          </Card>

          {datosPro.benchmarkOcupacion && (
            <Card className="gap-1.5 px-6 py-[22px]">
              <h2 className="text-[19px] font-bold">Comparación con la plataforma</h2>
              <p className="text-sm text-neutral-800">
                Tu ocupación es {datos.ocupacionPct.toFixed(0)}%, contra un promedio de{" "}
                {datosPro.benchmarkOcupacion.ocupacionPromedioPct.toFixed(0)}% en otras{" "}
                {datosPro.benchmarkOcupacion.canchasEnMuestra} canchas de la plataforma en este período.
              </p>
            </Card>
          )}

          {datosPro.tendenciasDemanda.length > 0 && (
            <Card className="gap-2 px-6 py-[22px]">
              <h2 className="text-[19px] font-bold">Demanda en crecimiento</h2>
              <ul className="flex flex-col gap-1.5">
                {datosPro.tendenciasDemanda.map((t) => (
                  <li key={`${t.diaSemana}-${t.hora}`} className="text-sm text-neutral-800">
                    Los {DIAS_LARGOS_DOM[t.diaSemana]} a las {t.hora}:00 vienen creciendo (+
                    {t.crecimientoPct.toFixed(0)}% últimas 3 semanas) — considerá agregar otro horario.
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
