import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoReserva } from "./types/database";

export const PERIODOS = { "7": 7, "30": 30, "90": 90 } as const;
export type PeriodoKey = keyof typeof PERIODOS;

const ESTADOS_CANCELACION: EstadoReserva[] = ["cancelada", "rechazada", "expirada"];

function formatearFecha(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function rangoPeriodo(dias: number, hoy = new Date()) {
  const hastaDate = new Date(hoy);
  hastaDate.setHours(0, 0, 0, 0);
  const desdeDate = new Date(hastaDate);
  desdeDate.setDate(desdeDate.getDate() - (dias - 1));
  const anteriorHastaDate = new Date(desdeDate);
  anteriorHastaDate.setDate(anteriorHastaDate.getDate() - 1);
  const anteriorDesdeDate = new Date(anteriorHastaDate);
  anteriorDesdeDate.setDate(anteriorDesdeDate.getDate() - (dias - 1));
  return {
    desde: formatearFecha(desdeDate),
    hasta: formatearFecha(hastaDate),
    anteriorDesde: formatearFecha(anteriorDesdeDate),
    anteriorHasta: formatearFecha(anteriorHastaDate),
  };
}

type ReservaCruda = {
  id: string;
  futbolero_id: string;
  estado: EstadoReserva;
  monto: number;
  slot_id: string;
};
type SlotCrudo = { id: string; fecha: string; hora_inicio: string; cancha_id: string };
type CalificacionCruda = { puntaje: number; created_at: string };

export type DatosInsights = {
  ingresos: number;
  ingresosPeriodoAnterior: number;
  ocupacionPct: number;
  tasaCancelacionPct: number;
  ratingPromedio: number | null;
  totalCalificaciones: number;
  proporcionRecurrentesPct: number | null;
  heatmap: { dia: number; hora: number; cantidad: number }[];
  ingresosPorSemana: { etiqueta: string; monto: number }[];
  clientesTop: { futboleroId: string; nombre: string; reservasConfirmadas: number }[];
};

// Todos los cálculos se hacen en JS sobre filas ya traídas (no agregados
// SQL) — a propósito, ver SPEC.md 10.3: 20 canchas no justifica esa
// complejidad todavía.
export async function calcularInsights(
  supabase: SupabaseClient,
  canchaIds: string[],
  dias: number
): Promise<DatosInsights> {
  const vacio: DatosInsights = {
    ingresos: 0,
    ingresosPeriodoAnterior: 0,
    ocupacionPct: 0,
    tasaCancelacionPct: 0,
    ratingPromedio: null,
    totalCalificaciones: 0,
    proporcionRecurrentesPct: null,
    heatmap: [],
    ingresosPorSemana: [],
    clientesTop: [],
  };
  if (canchaIds.length === 0) return vacio;

  const { desde, hasta, anteriorDesde, anteriorHasta } = rangoPeriodo(dias);

  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, cancha_id")
    .in("cancha_id", canchaIds)
    .gte("fecha", anteriorDesde)
    .lte("fecha", hasta);
  const slotsList = (slots ?? []) as SlotCrudo[];
  const slotPorId = new Map(slotsList.map((s) => [s.id, s]));
  const slotIds = slotsList.map((s) => s.id);

  const { data: reservas } = slotIds.length
    ? await supabase
        .from("reservas")
        .select("id, futbolero_id, estado, monto, slot_id")
        .in("slot_id", slotIds)
    : { data: [] };
  const reservasList = (reservas ?? []) as ReservaCruda[];

  const { data: calificaciones } = await supabase
    .from("calificaciones")
    .select("puntaje, created_at")
    .in("cancha_id", canchaIds)
    .gte("created_at", desde)
    .lte("created_at", `${hasta}T23:59:59`);
  const calificacionesList = (calificaciones ?? []) as CalificacionCruda[];

  const enPeriodo = (fecha: string) => fecha >= desde && fecha <= hasta;
  const enPeriodoAnterior = (fecha: string) => fecha >= anteriorDesde && fecha <= anteriorHasta;

  const reservasPeriodo = reservasList.filter((r) => {
    const slot = slotPorId.get(r.slot_id);
    return slot && enPeriodo(slot.fecha);
  });
  const reservasAnteriores = reservasList.filter((r) => {
    const slot = slotPorId.get(r.slot_id);
    return slot && enPeriodoAnterior(slot.fecha);
  });
  const slotsPeriodo = slotsList.filter((s) => enPeriodo(s.fecha));

  const confirmadasPeriodo = reservasPeriodo.filter((r) => r.estado === "confirmada");
  const canceladasPeriodo = reservasPeriodo.filter((r) => ESTADOS_CANCELACION.includes(r.estado));

  const ingresos = confirmadasPeriodo.reduce((acc, r) => acc + Number(r.monto), 0);
  const ingresosPeriodoAnterior = reservasAnteriores
    .filter((r) => r.estado === "confirmada")
    .reduce((acc, r) => acc + Number(r.monto), 0);

  const ocupacionPct = slotsPeriodo.length
    ? (confirmadasPeriodo.length / slotsPeriodo.length) * 100
    : 0;
  const tasaCancelacionPct = reservasPeriodo.length
    ? (canceladasPeriodo.length / reservasPeriodo.length) * 100
    : 0;

  const ratingPromedio = calificacionesList.length
    ? calificacionesList.reduce((acc, c) => acc + c.puntaje, 0) / calificacionesList.length
    : null;

  // Heatmap: cantidad de reservas confirmadas por día de semana (0=dom) × hora.
  const heatmapMapa = new Map<string, number>();
  for (const r of confirmadasPeriodo) {
    const slot = slotPorId.get(r.slot_id);
    if (!slot) continue;
    const dia = new Date(`${slot.fecha}T00:00:00`).getDay();
    const hora = Number(slot.hora_inicio.slice(0, 2));
    const clave = `${dia}-${hora}`;
    heatmapMapa.set(clave, (heatmapMapa.get(clave) ?? 0) + 1);
  }
  const heatmap = [...heatmapMapa.entries()].map(([clave, cantidad]) => {
    const [dia, hora] = clave.split("-").map(Number);
    return { dia, hora, cantidad };
  });

  // Ingresos por semana dentro del período (buckets de 7 días desde `desde`).
  const semanaMapa = new Map<number, number>();
  for (const r of confirmadasPeriodo) {
    const slot = slotPorId.get(r.slot_id);
    if (!slot) continue;
    const diffDias = Math.floor(
      (new Date(slot.fecha).getTime() - new Date(desde).getTime()) / 86400000
    );
    const semana = Math.floor(diffDias / 7);
    semanaMapa.set(semana, (semanaMapa.get(semana) ?? 0) + Number(r.monto));
  }
  const numSemanas = Math.max(1, Math.ceil(dias / 7));
  const ingresosPorSemana = Array.from({ length: numSemanas }, (_, i) => ({
    etiqueta: `Sem ${i + 1}`,
    monto: semanaMapa.get(i) ?? 0,
  }));

  // Clientes recurrentes: entre quienes reservaron confirmado en el período,
  // cuántos tienen más de 1 reserva confirmada en total (histórico, no solo
  // el período) — ver plan-monetizacion-admin.md sección 2.
  const futboleroIdsPeriodo = [...new Set(confirmadasPeriodo.map((r) => r.futbolero_id))];
  let proporcionRecurrentesPct: number | null = null;
  let clientesTop: DatosInsights["clientesTop"] = [];
  if (futboleroIdsPeriodo.length) {
    const { data: todasConfirmadas } = await supabase
      .from("reservas")
      .select("futbolero_id, slot_id")
      .eq("estado", "confirmada")
      .in("futbolero_id", futboleroIdsPeriodo);
    const conteoPorFutbolero = new Map<string, number>();
    for (const r of todasConfirmadas ?? []) {
      conteoPorFutbolero.set(r.futbolero_id, (conteoPorFutbolero.get(r.futbolero_id) ?? 0) + 1);
    }
    const recurrentes = [...conteoPorFutbolero.values()].filter((n) => n > 1).length;
    proporcionRecurrentesPct = (recurrentes / futboleroIdsPeriodo.length) * 100;

    const { data: futboleros } = await supabase
      .from("usuarios")
      .select("id, nombre")
      .in("id", futboleroIdsPeriodo);
    const nombrePorId = new Map((futboleros ?? []).map((f) => [f.id, f.nombre]));
    clientesTop = [...conteoPorFutbolero.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([futboleroId, reservasConfirmadas]) => ({
        futboleroId,
        nombre: nombrePorId.get(futboleroId) ?? "Futbolero",
        reservasConfirmadas,
      }));
  }

  return {
    ingresos,
    ingresosPeriodoAnterior,
    ocupacionPct,
    tasaCancelacionPct,
    ratingPromedio,
    totalCalificaciones: calificacionesList.length,
    proporcionRecurrentesPct,
    heatmap,
    ingresosPorSemana,
    clientesTop,
  };
}
