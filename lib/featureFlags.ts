import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Kill switch de `configuracion` (00000000000008_flag_cobro_grupal.sql).
 * Por diseño, apagarla no toca reservas/aportes ya en curso — solo bloquea
 * arrancar un cobro grupal nuevo. Ver el comentario de esa migración.
 * Si la fila no existe todavía (falta correr la migración), asume
 * habilitado — igual que el resto del feature, que ya requiere el schema de
 * 00000000000007 para funcionar en absoluto.
 */
export async function cobroGrupalHabilitado(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { data } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "cobro_grupal_habilitado")
    .maybeSingle();

  return data?.valor !== "false";
}
