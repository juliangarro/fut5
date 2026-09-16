import Link from "next/link";
import { ClipboardCheck, CircleCheck, Plus, LandPlot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { datosPanel } from "@/lib/admin/panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { FotoCancha } from "@/components/shared/FotoCancha";
import { StatCard } from "@/components/shared/StatCard";
import { formatearColones, formatearFechaLarga, formatearHora } from "@/lib/formato";
import { hoyCR } from "@/lib/fecha";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: canchas }, datos] = await Promise.all([
    supabase.from("usuarios").select("nombre").eq("id", user.id).single(),
    supabase
      .from("canchas")
      .select("id, nombre, rating_promedio, fotos")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false }),
    datosPanel(supabase, user.id),
  ]);

  const primerNombre = (perfil?.nombre ?? "").split(" ")[0] || "";
  const canchaPorId = new Map((canchas ?? []).map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6 px-[22px] pt-[52px] pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-neutral-700">
            {(() => {
              const fecha = formatearFechaLarga(hoyCR());
              return fecha.charAt(0).toUpperCase() + fecha.slice(1);
            })()}
          </p>
          <h1 className="text-[34px] font-bold">Buenas{primerNombre ? `, ${primerNombre}` : ""}</h1>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/canchas/nueva" />}>
          <Plus />
          Nueva cancha
        </Button>
      </div>

      <Link
        href="/admin/validaciones"
        className={
          datos.pendientes.total > 0
            ? "flex items-center gap-[22px] rounded-panel border border-terracota-300 bg-terracota-100 px-7 py-6"
            : "flex items-center gap-[22px] rounded-panel border border-sage-300 bg-sage-100 px-7 py-6"
        }
      >
        <div
          className={
            datos.pendientes.total > 0
              ? "flex size-[58px] shrink-0 items-center justify-center rounded-full bg-brand"
              : "flex size-[58px] shrink-0 items-center justify-center rounded-full bg-sage-700"
          }
        >
          {datos.pendientes.total > 0 ? (
            <ClipboardCheck className="size-7 text-background" aria-hidden="true" />
          ) : (
            <CircleCheck className="size-7 text-background" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {datos.pendientes.total > 0 ? (
            <>
              <p className="text-[22px] font-bold text-terracota-900">
                {datos.pendientes.total} comprobante{datos.pendientes.total > 1 ? "s" : ""} por validar
              </p>
              <p className="text-base text-terracota-900">
                {datos.pendientes.expiraMasProxima && new Date(datos.pendientes.expiraMasProxima) > new Date()
                  ? `El más viejo vence a las ${formatearHora(
                      new Intl.DateTimeFormat("es-CR", {
                        timeZone: "America/Costa_Rica",
                        hour: "2-digit",
                        minute: "2-digit",
                        hourCycle: "h23",
                      }).format(new Date(datos.pendientes.expiraMasProxima))
                    )}. Si no respondés a tiempo, la reserva vence y el horario se libera.`
                  : "Hay comprobantes vencidos esperando respuesta."}
              </p>
            </>
          ) : (
            <p className="text-[22px] font-bold text-sage-900">Estás al día</p>
          )}
        </div>
        <span
          aria-hidden="true"
          className={
            datos.pendientes.total > 0
              ? "inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground"
              : "inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-border bg-transparent px-5 text-base font-semibold"
          }
        >
          Ir a la cola
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Reservas hoy"
          value={String(datos.reservasHoy)}
          delta={datos.reservasHoyDeltaAyer ?? undefined}
          caption="vs. ayer"
          unidadDelta="pts"
        />
        <StatCard label="Ingresos hoy" value={formatearColones(datos.ingresosHoy)} detalle="confirmados" />
        <StatCard label="Ocupación (7 días)" value={`${datos.ocupacionSemana.toFixed(0)}%`} />
        <StatCard
          label="Rating"
          value={datos.rating !== null ? datos.rating.toFixed(1) : "—"}
          detalle={datos.totalCalificaciones > 0 ? `${datos.totalCalificaciones} calificaciones` : undefined}
        />
      </div>

      {(canchas ?? []).length === 0 ? (
        <EmptyState
          icono={LandPlot}
          titulo="Todavía no registraste ninguna cancha"
          descripcion="Creá tu primera cancha para empezar a recibir reservas."
          accion={{ texto: "Crear cancha", href: "/admin/canchas/nueva" }}
        />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4 rounded-panel bg-card px-6 py-[22px]">
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-bold">Mis canchas</h2>
              <Link href="/admin/canchas" className="text-sm font-semibold text-terracota-700">
                Ver todas
              </Link>
            </div>
            <ul className="flex flex-col gap-2.5">
              {(canchas ?? []).map((cancha) => {
                const primeraFoto = cancha.fotos?.[0];
                const fotoUrl = primeraFoto
                  ? supabase.storage.from("fotos-cancha").getPublicUrl(primeraFoto).data.publicUrl
                  : null;
                const horarios = datos.horariosSemanaPorCancha[cancha.id] ?? 0;
                return (
                  <li key={cancha.id} className="flex flex-wrap items-center gap-3 rounded-fila bg-background px-4 py-3.5">
                    <FotoCancha url={fotoUrl} alt={cancha.nombre} className="h-14 w-[72px] shrink-0 rounded-thumb" />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <p className="text-[17px] font-bold">{cancha.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        ★ {cancha.rating_promedio.toFixed(1)} · {horarios} horario{horarios === 1 ? "" : "s"} esta semana
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/admin/canchas/${cancha.id}/info`} />}
                      >
                        Info
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/admin/canchas/${cancha.id}/slots/nueva`} />}
                      >
                        Horarios
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col gap-4 rounded-panel bg-card px-6 py-[22px] lg:w-80">
            <h2 className="text-[19px] font-bold">Próximos partidos</h2>
            {datos.proximosPartidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay partidos confirmados próximos.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {datos.proximosPartidos.map((partido) => (
                  <li key={partido.reservaId} className="flex items-center gap-3">
                    <p className="w-13 shrink-0 text-[15px] font-bold">{formatearHora(partido.horaInicio)}</p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[15px] font-semibold">{partido.futboleroNombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {canchaPorId.get(partido.canchaId)?.nombre ?? "Cancha"} · {formatearColones(partido.monto)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
