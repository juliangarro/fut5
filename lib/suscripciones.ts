import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TierSuscripcion } from "@/lib/types/database";

/**
 * Feature-gating de monetización (plan-monetizacion-admin.md sección 6.2).
 * Sin fila en `suscripciones` = tier gratis, mismo patrón de "ausencia =
 * default" que `cobroGrupalHabilitado` (lib/featureFlags.ts).
 */
export async function nivelDeAcceso(
  supabase: SupabaseClient<Database>,
  adminId: string
): Promise<"gratis" | TierSuscripcion> {
  // Kill switch: si está apagado, nadie queda bloqueado de Pro por un bug
  // de gating — fail open a propósito, porque el riesgo de bloquear a un
  // AdminCancha que sí está pagando es peor que el de dejar pasar a uno
  // que no paga mientras se corrige el bug.
  if (!(await monetizacionHabilitada(supabase))) {
    return "pro_plus";
  }

  const { data } = await supabase
    .from("suscripciones")
    .select("tier, estado")
    .eq("admin_id", adminId)
    .maybeSingle();

  // El período de gracia mantiene acceso — no castigar al admin por lag
  // operativo en confirmar el pago (mismo principio de "no apilar
  // fricción" de la sección 1 del plan).
  if (!data || data.estado === "vencida") {
    return "gratis";
  }

  return data.tier;
}

/**
 * `destacado` se activa por cancha, no por cuenta — una cancha específica
 * se posiciona en el listado de búsqueda del Futbolero. Sin fail-open acá:
 * `monetizacion_habilitada` solo protege contra bloquear a alguien que
 * paga (ver nivelDeAcceso); un bug en este add-on como mucho oculta una
 * promoción ya pagada, no bloquea el uso del producto.
 */
export async function tieneDestacado(
  supabase: SupabaseClient<Database>,
  canchaId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("addons_suscripcion")
    .select("id")
    .eq("cancha_id", canchaId)
    .eq("addon", "destacado")
    .eq("estado", "activo")
    .maybeSingle();

  return data !== null;
}

/**
 * `moderacion_reportes` se activa por cuenta — habilita el botón de
 * reportar un comentario a un moderador humano (sección 4.2 del plan). El
 * filtro automático de lenguaje ofensivo NO pasa por este check: aplica a
 * todos los AdminCancha por igual, sin importar tier.
 */
export async function tieneModeracionReportes(
  supabase: SupabaseClient<Database>,
  adminId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("addons_suscripcion")
    .select("id")
    .eq("admin_id", adminId)
    .eq("addon", "moderacion_reportes")
    .is("cancha_id", null)
    .eq("estado", "activo")
    .maybeSingle();

  return data !== null;
}

async function monetizacionHabilitada(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "monetizacion_habilitada")
    .maybeSingle();

  return data?.valor !== "false";
}
