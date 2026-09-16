import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Conteo de reservas `pendiente_validacion` de todas las canchas de un
 * admin, más el `expira_at` más próximo entre ellas. Movido desde
 * app/admin/page.tsx (Fase 3 de plan-rediseno-dale-cancha.md) para
 * reusarlo en el layout (badge del sidebar/barra) y en el panel (banner).
 */
export async function contarPendientes(
  supabase: SupabaseClient<Database>,
  adminId: string
): Promise<{ total: number; expiraMasProxima: string | null }> {
  const { data: canchas } = await supabase.from("canchas").select("id").eq("admin_id", adminId);
  const canchaIds = (canchas ?? []).map((c) => c.id);
  if (canchaIds.length === 0) return { total: 0, expiraMasProxima: null };

  const { data: slots } = await supabase.from("slots").select("id").in("cancha_id", canchaIds);
  const slotIds = (slots ?? []).map((s) => s.id);
  if (slotIds.length === 0) return { total: 0, expiraMasProxima: null };

  const { data: reservas, count } = await supabase
    .from("reservas")
    .select("expira_at", { count: "exact" })
    .eq("estado", "pendiente_validacion")
    .in("slot_id", slotIds)
    .order("expira_at", { ascending: true, nullsFirst: false })
    .limit(1);

  return {
    total: count ?? 0,
    expiraMasProxima: reservas?.[0]?.expira_at ?? null,
  };
}
