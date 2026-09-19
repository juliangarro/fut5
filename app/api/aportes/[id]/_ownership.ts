import type { createClient } from "@/lib/supabase/server";
import type { EstadoAporte } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Mismo patrón que app/api/reservas/[id]/_ownership.ts: consultas encadenadas
// en vez de un embed de PostgREST, porque el Database type escrito a mano no
// define Relationships (ver ese archivo para el porqué).
export async function verificarPropiedadAdminAporte(
  supabase: SupabaseServerClient,
  aporteId: string
): Promise<
  | { error: string; status: number; aporte?: undefined; reserva?: undefined }
  | {
      error?: undefined;
      status?: undefined;
      aporte: { estado: EstadoAporte; reserva_id: string; monto: number };
      reserva: { estado: string; monto: number };
    }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", status: 401 };

  const { data: aporte } = await supabase
    .from("aportes")
    .select("estado, reserva_id, monto")
    .eq("id", aporteId)
    .single();
  if (!aporte) return { error: "Aporte no encontrado", status: 404 };

  const { data: reserva } = await supabase
    .from("reservas")
    .select("estado, monto, slot_id")
    .eq("id", aporte.reserva_id)
    .single();
  if (!reserva) return { error: "Aporte no encontrado", status: 404 };

  const { data: slot } = await supabase
    .from("slots")
    .select("cancha_id")
    .eq("id", reserva.slot_id)
    .single();
  if (!slot) return { error: "Aporte no encontrado", status: 404 };

  const { data: cancha } = await supabase
    .from("canchas")
    .select("admin_id")
    .eq("id", slot.cancha_id)
    .single();
  if (!cancha || cancha.admin_id !== user.id) {
    return { error: "No autorizado", status: 403 };
  }

  return { aporte, reserva: { estado: reserva.estado, monto: reserva.monto } };
}
