import type { EstadoSlot } from "@/lib/types/database";

export type Franja = "manana" | "tarde" | "noche";

export const ETIQUETA_FRANJA: Record<Franja, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};

/** Mañana: antes de las 12:00. Tarde: 12:00-17:59. Noche: desde las 18:00. */
export function franjaDeHora(horaInicio: string): Franja {
  const hora = Number(horaInicio.slice(0, 2));
  if (hora < 12) return "manana";
  if (hora < 18) return "tarde";
  return "noche";
}

const ESTADOS_OCUPADO: EstadoSlot[] = ["retenido", "reservado"];

/**
 * D13 (plan-rediseno-dale-cancha.md): la franja con mayor proporción de
 * slots retenido/reservado, con al menos 3 ocupados. Sin señal clara (nadie
 * llega al mínimo, o hay empate en la proporción máxima), no hay etiqueta.
 */
export function calcularFranjaMasPedida(
  slots: { hora_inicio: string; estado: EstadoSlot }[]
): Franja | null {
  const stats: Record<Franja, { ocupados: number; total: number }> = {
    manana: { ocupados: 0, total: 0 },
    tarde: { ocupados: 0, total: 0 },
    noche: { ocupados: 0, total: 0 },
  };

  for (const slot of slots) {
    const franja = franjaDeHora(slot.hora_inicio);
    stats[franja].total += 1;
    if (ESTADOS_OCUPADO.includes(slot.estado)) stats[franja].ocupados += 1;
  }

  const candidatas = (Object.keys(stats) as Franja[])
    .filter((f) => stats[f].ocupados >= 3)
    .map((f) => ({ franja: f, proporcion: stats[f].ocupados / stats[f].total }));

  if (candidatas.length === 0) return null;

  candidatas.sort((a, b) => b.proporcion - a.proporcion);
  const [primera, segunda] = candidatas;
  if (segunda && segunda.proporcion === primera.proporcion) return null;

  return primera.franja;
}
