/**
 * Formatos centralizados (D9, plan-rediseno-dale-cancha.md). `toLocaleString("es-CR")`
 * devuelve "14 000" (espacio) y "septiembre"; el diseño usa "14.000" (punto de
 * miles) y "setiembre" (uso local costarricense). Todo en America/Costa_Rica.
 */

const ZONA_CR = "America/Costa_Rica";

/** "₡14.000" — sin decimales, punto de miles. */
export function formatearColones(monto: number): string {
  const numero = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(monto);
  return `₡${numero}`;
}

/**
 * "martes 16 de setiembre" a partir de una fecha YYYY-MM-DD (interpretada como
 * fecha civil, no como instante) o de un timestamp completo / Date.
 * Un `new Date("2026-09-20")` se interpreta como medianoche UTC, que en hora
 * de Costa Rica (UTC-6) es la tarde del día anterior — mismo bug que D11, acá
 * evitado anclando las fechas YYYY-MM-DD al mediodía UTC.
 */
export function formatearFechaLarga(fecha: string | Date): string {
  const esSoloFecha = typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const d = esSoloFecha
    ? new Date(`${fecha}T12:00:00Z`)
    : typeof fecha === "string"
      ? new Date(fecha)
      : fecha;
  const partes = new Intl.DateTimeFormat("es-CR", {
    timeZone: ZONA_CR,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(d);

  const dia = partes.find((p) => p.type === "weekday")?.value ?? "";
  const numero = partes.find((p) => p.type === "day")?.value ?? "";
  const mes = corregirMes(partes.find((p) => p.type === "month")?.value ?? "");

  return `${dia} ${numero} de ${mes}`;
}

/** "sáb 20" — día corto y número, con "hoy" y "mañana" relativos si aplica. */
export function formatearDiaCorto(fechaISO: string, hoyISO: string): string {
  if (fechaISO === hoyISO) return "hoy";
  const manianaISO = sumarUnDiaISO(hoyISO);
  if (fechaISO === manianaISO) return "mañana";

  const d = new Date(`${fechaISO}T12:00:00`);
  const partes = new Intl.DateTimeFormat("es-CR", {
    timeZone: ZONA_CR,
    weekday: "short",
    day: "numeric",
  }).formatToParts(d);
  const dia = (partes.find((p) => p.type === "weekday")?.value ?? "").replace(".", "");
  const numero = partes.find((p) => p.type === "day")?.value ?? "";
  return `${dia} ${numero}`;
}

/** "18:00" a partir de "18:00:00" o "18:00". */
export function formatearHora(horaISO: string): string {
  return horaISO.slice(0, 5);
}

/**
 * "18:00" a partir de un timestamp completo (`expira_at`, `comprobante_subido_at`),
 * convertido a hora de Costa Rica. Nunca usar `new Date(...).toLocaleTimeString()`
 * sin `timeZone` acá: el runtime del servidor no está en UTC-6, mismo bug que D11.
 */
export function formatearHoraDeTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: ZONA_CR,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

/** "18:00–19:00". */
export function formatearRangoHoras(horaInicio: string, horaFin: string): string {
  return `${formatearHora(horaInicio)}–${formatearHora(horaFin)}`;
}

/** Iniciales para el Avatar: "Julián Garro" -> "JG". Máximo 2 letras. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// Intl.DateTimeFormat("es-CR") devuelve "septiembre"; el uso local costarricense
// (y el diseño) dicen "setiembre". Mismo caso para "sept." si algún día se usa short.
function corregirMes(mes: string): string {
  return mes.replace(/^septiembre$/i, "setiembre");
}

function sumarUnDiaISO(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12));
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_CR }).format(fecha);
}
