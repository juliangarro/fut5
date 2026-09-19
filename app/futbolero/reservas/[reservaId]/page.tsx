import { notFound, redirect } from "next/navigation";
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
  // Nota (2026-09-18): antes era `if (!user) notFound()`, inconsistente con
  // el resto de la app (todas las demás páginas protegidas hacen
  // redirect("/login")). Si la sesión expira o el refresh de cookie en
  // proxy.ts no llega a tiempo mientras el futbolero navega rápido entre
  // pantallas, este notFound() mostraba un 404 desnudo (sin
  // app/not-found.tsx propio hasta ahora) en vez de mandarlo a loguearse de
  // nuevo — reportado por el usuario como "404 y pantalla negra al moverme
  // entre acciones".
  if (!user) redirect("/login");

  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .select(
      "id, futbolero_id, estado, monto, motivo_rechazo, expira_at, slot_id, comprobante_url, comprobante_subido_at, modo_cobro, token_cobro, cantidad_aportes"
    )
    .eq("id", reservaId)
    .single();

  // Nota (2026-09-18): antes esto solo miraba `!reserva`, así que un error
  // real de Postgres (p.ej. una columna que no existe porque falta correr
  // una migración pendiente en producción) llegaba acá con `data: null` y
  // `error` seteado, y se mostraba como un 404 "no encontramos esta
  // página" indistinguible de una reserva legítimamente inexistente.
  // Encontrado end-to-end: TODAS las reservas devolvían 404 en el detalle
  // (pero sí listaban bien en /futbolero/reservas, que selecciona menos
  // columnas) — causado por modo_cobro/token_cobro/cantidad_aportes
  // (migración 00000000000007_cobro_grupal.sql) no aplicada aún en la base
  // de producción. Ahora un error real de Postgres se loguea y dispara el
  // error boundary (global-error.tsx) en vez de camuflarse de 404, para que
  // esto sea visible en los logs de Vercel la próxima vez.
  if (reservaError && reservaError.code !== "PGRST116") {
    console.error("[reservas/[reservaId]] error consultando reserva:", reservaError);
    throw new Error("No se pudo cargar la reserva. Intentá de nuevo en un momento.");
  }

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

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("fecha, hora_inicio, hora_fin, cancha_id")
    .eq("id", reserva.slot_id)
    .single();
  if (slotError && slotError.code !== "PGRST116") {
    console.error("[reservas/[reservaId]] error consultando slot:", slotError);
    throw new Error("No se pudo cargar la reserva. Intentá de nuevo en un momento.");
  }
  if (!slot) notFound();

  const { data: cancha, error: canchaError } = await supabase
    .from("canchas")
    .select("nombre, numero_sinpe, fotos")
    .eq("id", slot.cancha_id)
    .single();
  if (canchaError && canchaError.code !== "PGRST116") {
    console.error("[reservas/[reservaId]] error consultando cancha:", canchaError);
    throw new Error("No se pudo cargar la reserva. Intentá de nuevo en un momento.");
  }
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
