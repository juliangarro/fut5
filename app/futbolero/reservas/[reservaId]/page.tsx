import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReservaEstado } from "@/components/ReservaEstado";
import { cancelarReserva } from "./actions";

export default async function ReservaDetallePage({
  params,
}: {
  params: Promise<{ reservaId: string }>;
}) {
  const { reservaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: reserva } = await supabase
    .from("reservas")
    .select("id, futbolero_id, estado, monto, motivo_rechazo, expira_at, slot_id")
    .eq("id", reservaId)
    .single();

  if (!reserva || reserva.futbolero_id !== user.id) notFound();

  const { data: slot } = await supabase
    .from("slots")
    .select("fecha, hora_inicio, hora_fin, cancha_id")
    .eq("id", reserva.slot_id)
    .single();
  if (!slot) notFound();

  const { data: cancha } = await supabase
    .from("canchas")
    .select("nombre, numero_sinpe")
    .eq("id", slot.cancha_id)
    .single();
  if (!cancha) notFound();

  return (
    <ReservaEstado
      reservaInicial={reserva}
      cancha={cancha}
      slot={slot}
      onCancelar={cancelarReserva}
    />
  );
}
