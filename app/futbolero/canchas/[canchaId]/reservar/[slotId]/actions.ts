"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Crea la Reserva (estado `creada`) recién acá, no al tocar el Slot en el
// calendario — ver plan-ui-ux-canchas-fut5-cr.md 5.4: mirar el resumen de
// pago no debe retener el horario. Se ejecuta como Server Action ligada al
// submit del botón "Ya pagué, subir comprobante", no como efecto de cargar
// la página siguiente (un Link prefetcheado no debe crear una Reserva).
export async function confirmarPago(canchaId: string, slotId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Idempotente: si ya existe una reserva activa de este futbolero para este
  // slot (ej. volvió atrás y confirmó de nuevo), la reusa en vez de duplicar.
  const { data: reservaExistente } = await supabase
    .from("reservas")
    .select("id")
    .eq("slot_id", slotId)
    .eq("futbolero_id", user.id)
    .in("estado", ["creada", "pendiente_validacion"])
    .maybeSingle();

  if (reservaExistente) {
    redirect(`/futbolero/canchas/${canchaId}/reservar/${slotId}/comprobante`);
  }

  const { data: slot, error: errorSlot } = await supabase
    .from("slots")
    .select("id, precio, cancha_id")
    .eq("id", slotId)
    .single();

  if (errorSlot || !slot) {
    redirect(`/futbolero/canchas/${canchaId}?error=slot_no_disponible`);
  }

  const { error } = await supabase
    .from("reservas")
    .insert({ futbolero_id: user.id, slot_id: slot.id, monto: slot.precio });

  if (error) {
    // El trigger retener_slot_al_crear_reserva aborta con un mensaje claro
    // si el slot ya no está disponible (carrera con otro futbolero).
    redirect(`/futbolero/canchas/${canchaId}?error=slot_no_disponible`);
  }

  redirect(`/futbolero/canchas/${canchaId}/reservar/${slotId}/comprobante`);
}
