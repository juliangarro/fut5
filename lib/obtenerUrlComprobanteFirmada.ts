import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const EXPIRACION_SEGUNDOS = 300;

// El primer intento de firmar la URL de un comprobante recién subido a
// veces devuelve error (visto en QA manual, se resuelve solo al recargar —
// ver plan-mejoras.md #1). No hay certeza de la causa exacta (latencia de
// Supabase Storage vs. algo de caching de fetch en el Server Component), así
// que en vez de adivinar más se loguea el error (10.5 de SPEC.md, eventos de
// negocio clave) y se reintenta una vez — cubre ambas hipótesis sin apostar
// a una sola.
export async function obtenerUrlComprobanteFirmada(
  supabase: SupabaseClient,
  path: string,
  reservaId: string
): Promise<string | null> {
  for (let intento = 1; intento <= 2; intento++) {
    const { data, error } = await supabase.storage
      .from("comprobantes")
      .createSignedUrl(path, EXPIRACION_SEGUNDOS);

    if (data?.signedUrl) return data.signedUrl;

    console.error(
      `[comprobantes] fallo al firmar URL (intento ${intento}/2) reserva=${reservaId} path=${path}:`,
      error?.message
    );
    if (intento < 2) await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}
