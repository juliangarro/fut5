import type { createClient } from "@/lib/supabase/server";
import type { EstadoReserva } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Se hacen 3 consultas encadenadas en vez de un select anidado de PostgREST
// para mantener el tipado simple con el Database type escrito a mano (ver
// lib/types/database.ts) — no define metadata de relaciones. Ver DECISIONS.md.
export async function verificarPropiedadAdmin(
  supabase: SupabaseServerClient,
  reservaId: string
): Promise<
  | { error: string; status: number; reserva?: undefined }
  | { error?: undefined; status?: undefined; reserva: { estado: EstadoReserva; slot_id: string } }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado", status: 401 };

  const { data: reserva } = await supabase
    .from("reservas")
    .select("estado, slot_id")
    .eq("id", reservaId)
    .single();
  if (!reserva) return { error: "Reserva no encontrada", status: 404 };

  const { data: slot } = await supabase
    .from("slots")
    .select("cancha_id")
    .eq("id", reserva.slot_id)
    .single();
  if (!slot) return { error: "Reserva no encontrada", status: 404 };

  const { data: cancha } = await supabase
    .from("canchas")
    .select("admin_id")
    .eq("id", slot.cancha_id)
    .single();
  if (!cancha || cancha.admin_id !== user.id) {
    return { error: "No autorizado", status: 403 };
  }

  return { reserva };
}
