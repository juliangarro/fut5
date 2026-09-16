import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { hoyCR, sumarDiasCR } from "@/lib/fecha";
import { calcularInsights } from "@/lib/insights";
import { contarPendientes } from "@/lib/admin/contarPendientes";

export type ProximoPartido = {
  reservaId: string;
  futboleroNombre: string;
  canchaId: string;
  fecha: string;
  horaInicio: string;
  monto: number;
};

export type DatosPanel = {
  reservasHoy: number;
  /** null si ayer no había horarios cargados (sin base de comparación). */
  reservasHoyDeltaAyer: number | null;
  ingresosHoy: number;
  ocupacionSemana: number;
  rating: number | null;
  totalCalificaciones: number;
  horariosSemanaPorCancha: Record<string, number>;
  proximosPartidos: ProximoPartido[];
  pendientes: { total: number; expiraMasProxima: string | null };
};

const VACIO: DatosPanel = {
  reservasHoy: 0,
  reservasHoyDeltaAyer: null,
  ingresosHoy: 0,
  ocupacionSemana: 0,
  rating: null,
  totalCalificaciones: 0,
  horariosSemanaPorCancha: {},
  proximosPartidos: [],
  pendientes: { total: 0, expiraMasProxima: null },
};

/**
 * Métricas del panel del admin (Fase 10 de plan-rediseno-dale-cancha.md).
 * Solo lecturas nuevas, ninguna toca la máquina de estados. Definiciones
 * de cada métrica documentadas en DECISIONS.md — no reinterpretar acá sin
 * actualizar ese registro.
 */
export async function datosPanel(
  supabase: SupabaseClient<Database>,
  adminId: string
): Promise<DatosPanel> {
  const { data: canchas } = await supabase.from("canchas").select("id").eq("admin_id", adminId);
  const canchaIds = (canchas ?? []).map((c) => c.id);
  if (canchaIds.length === 0) return VACIO;

  const hoy = hoyCR();
  const ayer = sumarDiasCR(hoy, -1);
  const finSemana = sumarDiasCR(hoy, 6);

  const [{ data: slotsHoy }, { data: slotsAyer }, { data: slotsSemana }, insights, pendientes] =
    await Promise.all([
      supabase.from("slots").select("id").in("cancha_id", canchaIds).eq("fecha", hoy),
      supabase.from("slots").select("id").in("cancha_id", canchaIds).eq("fecha", ayer),
      supabase
        .from("slots")
        .select("id, cancha_id")
        .in("cancha_id", canchaIds)
        .gte("fecha", hoy)
        .lte("fecha", finSemana),
      calcularInsights(supabase, canchaIds, 7),
      contarPendientes(supabase, adminId),
    ]);

  const slotIdsHoy = (slotsHoy ?? []).map((s) => s.id);
  const slotIdsAyer = (slotsAyer ?? []).map((s) => s.id);

  const { data: reservasHoyData } = slotIdsHoy.length
    ? await supabase
        .from("reservas")
        .select("id, estado, monto")
        .in("slot_id", slotIdsHoy)
        .in("estado", ["confirmada", "pendiente_validacion"])
    : { data: [] };

  const { data: reservasAyerData } = slotIdsAyer.length
    ? await supabase
        .from("reservas")
        .select("id")
        .in("slot_id", slotIdsAyer)
        .in("estado", ["confirmada", "pendiente_validacion"])
    : { data: [] };

  const reservasHoy = (reservasHoyData ?? []).length;
  const ingresosHoy = (reservasHoyData ?? [])
    .filter((r) => r.estado === "confirmada")
    .reduce((suma, r) => suma + r.monto, 0);

  // "solo si ayer hay datos": se toma como proxy si existían horarios
  // cargados ayer — sin eso no hay base real de comparación (podría ser
  // simplemente que la cancha no operaba ese día).
  const reservasHoyDeltaAyer = slotIdsAyer.length > 0 ? reservasHoy - (reservasAyerData ?? []).length : null;

  const horariosSemanaPorCancha: Record<string, number> = {};
  for (const slot of slotsSemana ?? []) {
    horariosSemanaPorCancha[slot.cancha_id] = (horariosSemanaPorCancha[slot.cancha_id] ?? 0) + 1;
  }

  // Próximos partidos: hasta 5 reservas confirmadas con fecha >= hoy. Se
  // arma con consultas separadas (no embeds de PostgREST) para mantener el
  // mismo patrón manual que el resto del código con este cliente tipado.
  const { data: slotsFuturos } = await supabase
    .from("slots")
    .select("id, cancha_id, fecha, hora_inicio")
    .in("cancha_id", canchaIds)
    .gte("fecha", hoy);
  const slotFuturoPorId = new Map((slotsFuturos ?? []).map((s) => [s.id, s]));
  const slotIdsFuturos = (slotsFuturos ?? []).map((s) => s.id);

  const { data: reservasConfirmadas } = slotIdsFuturos.length
    ? await supabase
        .from("reservas")
        .select("id, monto, slot_id, futbolero_id")
        .in("slot_id", slotIdsFuturos)
        .eq("estado", "confirmada")
    : { data: [] };

  const futboleroIds = [...new Set((reservasConfirmadas ?? []).map((r) => r.futbolero_id))];
  const { data: futboleros } = futboleroIds.length
    ? await supabase.from("usuarios").select("id, nombre").in("id", futboleroIds)
    : { data: [] };
  const futboleroPorId = new Map((futboleros ?? []).map((f) => [f.id, f.nombre]));

  const proximosPartidos: ProximoPartido[] = (reservasConfirmadas ?? [])
    .flatMap((reserva) => {
      const slot = slotFuturoPorId.get(reserva.slot_id);
      if (!slot) return [];
      return [
        {
          reservaId: reserva.id,
          futboleroNombre: futboleroPorId.get(reserva.futbolero_id) ?? "Futbolero",
          canchaId: slot.cancha_id,
          fecha: slot.fecha,
          horaInicio: slot.hora_inicio,
          monto: reserva.monto,
        },
      ];
    })
    .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))
    .slice(0, 5);

  return {
    reservasHoy,
    reservasHoyDeltaAyer,
    ingresosHoy,
    ocupacionSemana: insights.ocupacionPct,
    rating: insights.ratingPromedio,
    totalCalificaciones: insights.totalCalificaciones,
    horariosSemanaPorCancha,
    proximosPartidos,
    pendientes,
  };
}
