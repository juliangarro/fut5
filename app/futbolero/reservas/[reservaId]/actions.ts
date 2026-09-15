"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelarReserva(reservaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: reserva } = await supabase
    .from("reservas")
    .select("estado, futbolero_id")
    .eq("id", reservaId)
    .single();

  if (!reserva || reserva.futbolero_id !== user.id) {
    throw new Error("Reserva no encontrada");
  }
  // Regla de negocio (ver SPEC.md 5.2): solo se puede cancelar antes de subir
  // comprobante desde acá. La cancelación post-confirmación según política de
  // cancelación de la cancha queda fuera de este slice — ver DECISIONS.md.
  if (reserva.estado !== "creada") {
    throw new Error("Esta reserva ya no se puede cancelar desde acá.");
  }

  const { error } = await supabase
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("id", reservaId);

  if (error) throw new Error(error.message);

  revalidatePath(`/futbolero/reservas/${reservaId}`);
  revalidatePath("/futbolero/reservas");
}
