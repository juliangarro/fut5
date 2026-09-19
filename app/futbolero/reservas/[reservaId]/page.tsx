import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { obtenerUrlComprobanteFirmada } from "@/lib/obtenerUrlComprobanteFirmada";
import { ReservaEstado } from "@/components/ReservaEstado";
import { cobroGrupalHabilitado } from "@/lib/featureFlags";
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
      "id, futbolero_id, estado, monto, motivo_rechazo, expira_at, slot_id, comprobante_url, comprobante_subido_at, modo_cobro, token_cobro, cantidad_aportes"
    )
    .eq("id", reservaId)
    .single();

  if (!reserva || reserva.futbolero_id !== user.id) notFound();

  const { data: aportes } =
    reserva.modo_cobro === "grupal"
      ? await supabase
          .from("aportes")
          .select("id, nombre, estado")
          .eq("reserva_id", reserva.id)
          .order("created_at", { ascending: true })
      : { data: [] };

  // "origin" no siempre viene en una navegación GET normal (solo en
  // requests cross-origin) — se arma a partir de "host" + protocolo, como
  // hace Next internamente para request.nextUrl.origin en un Route Handler.
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const protocolo = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const origenSitio = host ? `${protocolo}://${host}` : "";

  // El flag solo bloquea ARRANCAR un cobro grupal nuevo — una reserva que ya
  // está en modo_cobro='grupal' sigue mostrándose normal aunque se apague
  // después (ver lib/featureFlags.ts).
  const mostrarCobroGrupal = reserva.modo_cobro === "grupal" || (await cobroGrupalHabilitado(supabase));

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
        modo_cobro: reserva.modo_cobro,
        token_cobro: reserva.token_cobro,
        cantidad_aportes: reserva.cantidad_aportes,
      }}
      comprobanteUrl={comprobanteUrl}
      cancha={{ nombre: cancha.nombre, numero_sinpe: cancha.numero_sinpe, foto: cancha.fotos[0] ?? null }}
      slot={slot}
      onCancelar={cancelarReserva}
      aportesIniciales={aportes ?? []}
      origenSitio={origenSitio}
      cobroGrupalHabilitado={mostrarCobroGrupal}
    />
  );
}
