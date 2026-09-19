import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rangoPeriodo } from "./insights";

// Insights adicionales del tier Pro (plan-monetizacion-admin.md sección 2,
// "Insights adicionales que agregaría para el tier pago"). Separado de
// lib/insights.ts a propósito: esos cálculos corren para TODOS los admins
// (base gratis de SPEC.md 3.3); estos solo corren cuando la página ya
// verificó nivelDeAcceso === 'pro'/'pro_plus' — no tiene sentido pagar el
// costo de estas queries para un admin del tier gratis.
//
// Mismo criterio que lib/insights.ts (ver SPEC.md 10.3): agregación en JS
// sobre filas ya traídas, no SQL agregado — 20 canchas piloto no lo
// justifica todavía.

const MINUTOS_DEMORA_ALERTA = 20;
const SEMANAS_TENDENCIA = 6;
const MIN_CANCHAS_MUESTRA_BENCHMARK = 5;
const UMBRAL_CAIDA_OCUPACION_PUNTOS = 10;
const UMBRAL_CRECIMIENTO_TENDENCIA_PCT = 30;
const MIN_SLOTS_PARA_HORA_MENOS_OCUPADA = 3;
const MIN_RESERVAS_RECIENTES_TENDENCIA = 2;

type SlotCrudo = { id: string; fecha: string; hora_inicio: string; cancha_id: string };
type ReservaCruda = { estado: string; monto: number; slot_id: string };

export type DatosInsightsPro = {
  ingresoPorHora: { etiqueta: string; monto: number }[];
  horaMasRentable: { hora: number; ingresos: number } | null;
  horaMenosOcupada: { hora: number; ocupacionPct: number } | null;
  comprobantesDemorados: number;
  alertaOcupacion: { actualPct: number; anteriorPct: number; caidaPct: number } | null;
  tendenciasDemanda: { diaSemana: number; hora: number; crecimientoPct: number }[];
  benchmarkOcupacion: { ocupacionPromedioPct: number; canchasEnMuestra: number } | null;
};

export async function calcularInsightsPro(
  supabase: SupabaseClient,
  canchaIds: string[],
  dias: number
): Promise<DatosInsightsPro> {
  const vacio: DatosInsightsPro = {
    ingresoPorHora: [],
    horaMasRentable: null,
    horaMenosOcupada: null,
    comprobantesDemorados: 0,
    alertaOcupacion: null,
    tendenciasDemanda: [],
    benchmarkOcupacion: null,
  };
  if (canchaIds.length === 0) return vacio;

  const [porHora, comprobantesDemorados, alertaOcupacion, tendenciasDemanda, benchmarkOcupacion] =
    await Promise.all([
      calcularIngresoPorHora(supabase, canchaIds, dias),
      contarComprobantesDemorados(supabase, canchaIds),
      calcularAlertaOcupacion(supabase, canchaIds),
      calcularTendenciasDemanda(supabase, canchaIds),
      calcularBenchmarkOcupacion(supabase, canchaIds, dias),
    ]);

  return { ...porHora, comprobantesDemorados, alertaOcupacion, tendenciasDemanda, benchmarkOcupacion };
}

// Ingreso por franja horaria — le dice al admin qué horas subir de precio
// (horaMasRentable) y cuáles bajar para llenar (horaMenosOcupada).
async function calcularIngresoPorHora(supabase: SupabaseClient, canchaIds: string[], dias: number) {
  const { desde, hasta } = rangoPeriodo(dias);

  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, cancha_id")
    .in("cancha_id", canchaIds)
    .gte("fecha", desde)
    .lte("fecha", hasta);
  const slotsList = (slots ?? []) as SlotCrudo[];
  const slotPorId = new Map(slotsList.map((s) => [s.id, s]));
  const slotIds = slotsList.map((s) => s.id);

  const { data: reservas } = slotIds.length
    ? await supabase.from("reservas").select("estado, monto, slot_id").in("slot_id", slotIds)
    : { data: [] };
  const reservasList = (reservas ?? []) as ReservaCruda[];

  const totalPorHora = new Map<number, number>();
  for (const s of slotsList) {
    const hora = Number(s.hora_inicio.slice(0, 2));
    totalPorHora.set(hora, (totalPorHora.get(hora) ?? 0) + 1);
  }

  const ingresoPorHoraMapa = new Map<number, number>();
  const confirmadasPorHora = new Map<number, number>();
  for (const r of reservasList) {
    if (r.estado !== "confirmada") continue;
    const slot = slotPorId.get(r.slot_id);
    if (!slot) continue;
    const hora = Number(slot.hora_inicio.slice(0, 2));
    ingresoPorHoraMapa.set(hora, (ingresoPorHoraMapa.get(hora) ?? 0) + Number(r.monto));
    confirmadasPorHora.set(hora, (confirmadasPorHora.get(hora) ?? 0) + 1);
  }

  const horas = [...totalPorHora.keys()].sort((a, b) => a - b);
  const ingresoPorHora = horas.map((hora) => ({
    etiqueta: `${hora}h`,
    monto: ingresoPorHoraMapa.get(hora) ?? 0,
  }));

  let horaMasRentable: { hora: number; ingresos: number } | null = null;
  for (const [hora, ingresos] of ingresoPorHoraMapa) {
    if (ingresos > 0 && (!horaMasRentable || ingresos > horaMasRentable.ingresos)) {
      horaMasRentable = { hora, ingresos };
    }
  }

  let horaMenosOcupada: { hora: number; ocupacionPct: number } | null = null;
  for (const hora of horas) {
    const total = totalPorHora.get(hora) ?? 0;
    // Umbral mínimo de slots para no sacar conclusiones de una sola franja
    // con 1-2 horarios publicados en todo el período.
    if (total < MIN_SLOTS_PARA_HORA_MENOS_OCUPADA) continue;
    const ocupacionPct = ((confirmadasPorHora.get(hora) ?? 0) / total) * 100;
    if (!horaMenosOcupada || ocupacionPct < horaMenosOcupada.ocupacionPct) {
      horaMenosOcupada = { hora, ocupacionPct };
    }
  }

  return { ingresoPorHora, horaMasRentable, horaMenosOcupada };
}

// Alerta: "N comprobantes llevan +20 min sin validar" — plata perdida real
// si expiran por descuido. Sin filtro de período: son reservas activas
// ahora mismo, no una métrica histórica.
async function contarComprobantesDemorados(supabase: SupabaseClient, canchaIds: string[]): Promise<number> {
  const { data: slots } = await supabase.from("slots").select("id").in("cancha_id", canchaIds);
  const slotIds = (slots ?? []).map((s) => s.id);
  if (!slotIds.length) return 0;

  const limite = new Date(Date.now() - MINUTOS_DEMORA_ALERTA * 60 * 1000).toISOString();
  const { data: pendientesDemorados } = await supabase
    .from("reservas")
    .select("id")
    .eq("estado", "pendiente_validacion")
    .in("slot_id", slotIds)
    .lte("comprobante_subido_at", limite);

  return (pendientesDemorados ?? []).length;
}

// Alerta: "tu ocupación bajó X% esta semana" — siempre semana actual vs.
// semana anterior (7 días fijos), independiente del selector de período de
// la página, porque es una alerta de corto plazo, no una métrica histórica.
async function calcularAlertaOcupacion(supabase: SupabaseClient, canchaIds: string[]) {
  const { desde, hasta, anteriorDesde, anteriorHasta } = rangoPeriodo(7);

  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha")
    .in("cancha_id", canchaIds)
    .gte("fecha", anteriorDesde)
    .lte("fecha", hasta);
  const slotsList = (slots ?? []) as { id: string; fecha: string }[];
  const slotPorId = new Map(slotsList.map((s) => [s.id, s]));
  const slotIds = slotsList.map((s) => s.id);

  const { data: reservas } = slotIds.length
    ? await supabase
        .from("reservas")
        .select("slot_id")
        .eq("estado", "confirmada")
        .in("slot_id", slotIds)
    : { data: [] };
  const confirmadas = (reservas ?? []) as { slot_id: string }[];

  const slotsActual = slotsList.filter((s) => s.fecha >= desde && s.fecha <= hasta);
  const slotsAnterior = slotsList.filter((s) => s.fecha >= anteriorDesde && s.fecha <= anteriorHasta);
  if (slotsActual.length === 0 || slotsAnterior.length === 0) return null;

  const contarConfirmadasEn = (fechaMin: string, fechaMax: string) =>
    confirmadas.filter((r) => {
      const slot = slotPorId.get(r.slot_id);
      return slot && slot.fecha >= fechaMin && slot.fecha <= fechaMax;
    }).length;

  const actualPct = (contarConfirmadasEn(desde, hasta) / slotsActual.length) * 100;
  const anteriorPct = (contarConfirmadasEn(anteriorDesde, anteriorHasta) / slotsAnterior.length) * 100;
  const caidaPct = anteriorPct - actualPct;

  // Solo alertar si bajó de verdad — no ruido de fluctuaciones menores.
  if (caidaPct < UMBRAL_CAIDA_OCUPACION_PUNTOS) return null;

  return { actualPct, anteriorPct, caidaPct };
}

// Predicción simple de demanda: media móvil de 6 semanas por (día de
// semana, hora) — sin ML, tal como lo pide la sección 2 del plan.
// Compara el promedio de las 3 semanas más recientes contra las 3
// anteriores; solo reporta franjas con señal real y crecimiento sostenido.
async function calcularTendenciasDemanda(supabase: SupabaseClient, canchaIds: string[]) {
  const dias = SEMANAS_TENDENCIA * 7;
  const { desde, hasta } = rangoPeriodo(dias);

  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, cancha_id")
    .in("cancha_id", canchaIds)
    .gte("fecha", desde)
    .lte("fecha", hasta);
  const slotsList = (slots ?? []) as SlotCrudo[];
  const slotPorId = new Map(slotsList.map((s) => [s.id, s]));
  const slotIds = slotsList.map((s) => s.id);

  const { data: reservas } = slotIds.length
    ? await supabase.from("reservas").select("slot_id").eq("estado", "confirmada").in("slot_id", slotIds)
    : { data: [] };
  const confirmadas = (reservas ?? []) as { slot_id: string }[];

  const fechaEnMs = (fecha: string) => new Date(`${fecha}T00:00:00`).getTime();
  const desdeMs = fechaEnMs(desde);
  const semanaDeFecha = (fecha: string) => Math.floor((fechaEnMs(fecha) - desdeMs) / (7 * 86400000));

  // clave "diaSemana-hora" -> conteo de confirmadas por semana (0=más
  // vieja .. SEMANAS_TENDENCIA-1=más reciente)
  const bucket = new Map<string, number[]>();
  for (const r of confirmadas) {
    const slot = slotPorId.get(r.slot_id);
    if (!slot) continue;
    const semana = semanaDeFecha(slot.fecha);
    if (semana < 0 || semana >= SEMANAS_TENDENCIA) continue;
    const diaSemana = new Date(`${slot.fecha}T00:00:00`).getDay();
    const hora = Number(slot.hora_inicio.slice(0, 2));
    const clave = `${diaSemana}-${hora}`;
    if (!bucket.has(clave)) bucket.set(clave, new Array(SEMANAS_TENDENCIA).fill(0));
    bucket.get(clave)![semana] += 1;
  }

  const mitad = SEMANAS_TENDENCIA / 2;
  const tendencias: { diaSemana: number; hora: number; crecimientoPct: number }[] = [];

  for (const [clave, counts] of bucket) {
    const [diaSemana, hora] = clave.split("-").map(Number);
    const viejas = counts.slice(0, mitad).reduce((a, b) => a + b, 0) / mitad;
    const recientes = counts.slice(mitad).reduce((a, b) => a + b, 0) / mitad;

    if (recientes < MIN_RESERVAS_RECIENTES_TENDENCIA) continue;
    if (viejas === 0) continue; // sin base de comparación real (evita "infinito%")

    const crecimientoPct = ((recientes - viejas) / viejas) * 100;
    if (crecimientoPct < UMBRAL_CRECIMIENTO_TENDENCIA_PCT) continue;

    tendencias.push({ diaSemana, hora, crecimientoPct });
  }

  return tendencias.sort((a, b) => b.crecimientoPct - a.crecimientoPct).slice(0, 3);
}

// Comparación anonimizada contra el promedio de la plataforma. `slots` es
// de lectura pública (slots_select_publico, 00000000000003) — no hace
// falta service role ni una función nueva: se calcula con la misma sesión
// del admin, filtrando en JS las canchas ajenas del resto. Ocupación
// (no ingresos) porque `reservas.monto` de otros admins SÍ está protegido
// por RLS y no se puede promediar sin una función security definer nueva
// — fuera de alcance por ahora, ver plan-monetizacion-admin.md sección 2.
async function calcularBenchmarkOcupacion(supabase: SupabaseClient, canchaIds: string[], dias: number) {
  const { desde, hasta } = rangoPeriodo(dias);

  const { data: todosLosSlots } = await supabase
    .from("slots")
    .select("cancha_id, estado")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const propios = new Set(canchaIds);
  const slotsDeOtros = (todosLosSlots ?? []).filter((s) => !propios.has(s.cancha_id));

  const canchasEnMuestra = new Set(slotsDeOtros.map((s) => s.cancha_id)).size;
  // Muestra mínima de canchas ajenas: con menos, el "promedio" es
  // trivialmente reversible a 1-2 canchas específicas — deja de ser
  // anónimo. Ver decisión del 18 set 2026.
  if (canchasEnMuestra < MIN_CANCHAS_MUESTRA_BENCHMARK || slotsDeOtros.length === 0) {
    return null;
  }

  // Mismo criterio que ocupacionPct en lib/insights.ts: solo 'reservado'
  // cuenta como ocupado (equivalente a reservas.estado='confirmada'), no
  // 'retenido' (todavía sin confirmar) ni 'bloqueado' (no es demanda real).
  const ocupados = slotsDeOtros.filter((s) => s.estado === "reservado").length;
  const ocupacionPromedioPct = (ocupados / slotsDeOtros.length) * 100;

  return { ocupacionPromedioPct, canchasEnMuestra };
}
