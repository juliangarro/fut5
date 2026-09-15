"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function reservarSlot(formData: FormData) {
  const slotId = String(formData.get("slotId") ?? "");
  if (!slotId) throw new Error("slotId requerido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: slot, error: errorSlot } = await supabase
    .from("slots")
    .select("id, precio, cancha_id, estado")
    .eq("id", slotId)
    .single();

  if (errorSlot || !slot) {
    throw new Error("El slot ya no existe.");
  }

  const { data: reserva, error } = await supabase
    .from("reservas")
    .insert({ futbolero_id: user.id, slot_id: slot.id, monto: slot.precio })
    .select("id")
    .single();

  if (error) {
    // El trigger retener_slot_al_crear_reserva aborta con un mensaje claro
    // si el slot ya no está disponible (carrera con otro futbolero).
    redirect(`/futbolero/canchas/${slot.cancha_id}?error=slot_no_disponible`);
  }

  redirect(`/futbolero/reservas/${reserva!.id}`);
}
