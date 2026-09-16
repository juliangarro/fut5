import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUrlComprobanteFirmada } from "@/lib/obtenerUrlComprobanteFirmada";
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
    .select(
      "id, futbolero_id, estado, monto, motivo_rechazo, expira_at, slot_id, comprobante_url, comprobante_subido_at"
    )
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
    .select("nombre, numero_sinpe, fotos")
    .eq("id", slot.cancha_id)
    .single();
  if (!cancha) notFound();

  // Lectura nueva (Fase 8): el futbolero puede leer su propio comprobante vía
  // la policy `comprobantes_select_dueno`. Se firma acá para no exponer la
  // ruta cruda del bucket al cliente.
  const comprobanteUrl = reserva.comprobante_url
    ? await obtenerUrlComprobanteFirmada(supabase, reserva.comprobante_url, reserva.id)
    : null;

  return (
    <ReservaEstado
      reservaInicial={{
        id: reserva.id,
        estado: reserva.estado,
        monto: reserva.monto,
        motivo_rechazo: reserva.motivo_rechazo,
        expira_at: reserva.expira_at,
        comprobante_subido_at: reserva.comprobante_subido_at,
      }}
      comprobanteUrl={comprobanteUrl}
      cancha={{ nombre: cancha.nombre, numero_sinpe: cancha.numero_sinpe, foto: cancha.fotos[0] ?? null }}
      slot={slot}
      onCancelar={cancelarReserva}
    />
  );
}
