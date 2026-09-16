/**
 * Helpers de fecha en hora de Costa Rica (America/Costa_Rica, UTC-6, sin
 * horario de verano). El servidor corre en UTC; `new Date().toISOString()`
 * calcula "hoy" en UTC, así que después de las 18:00 hora CR ya es "mañana"
 * en UTC y desaparecen los horarios de esa noche. Ver D11 en
 * plan-rediseno-dale-cancha.md.
 */

const ZONA_CR = "America/Costa_Rica";

/** "hoy" en formato YYYY-MM-DD, calculado en hora de Costa Rica. */
export function hoyCR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_CR }).format(new Date());
}

/** Suma (o resta, con n negativo) días a una fecha YYYY-MM-DD, en hora de Costa Rica. */
export function sumarDiasCR(fechaISO: string, n: number): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  // Mediodía UTC evita que un +/-1 día por DST o redondeo cruce al día equivocado.
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12));
  fecha.setUTCDate(fecha.getUTCDate() + n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_CR }).format(fecha);
}
