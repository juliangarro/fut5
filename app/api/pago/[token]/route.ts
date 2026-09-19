import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Pública, sin auth: el amigo abre esto desde un link de WhatsApp, sin
// cuenta. Usa el service role porque no existe una policy RLS para "anon
// con el token correcto" — la única verificación de acceso es que el token
// (UUID random, no adivinable) coincida. Ver comentario en la migración
// 00000000000007_cobro_grupal.sql.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: reserva } = await supabase
    .from("reservas")
    .select("id, estado, monto, modo_cobro, cantidad_aportes, slot_id, futbolero_id")
    .eq("token_cobro", token)
    .maybeSingle();

  if (!reserva || reserva.modo_cobro !== "grupal") {
    return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
  }

  const { data: slot } = await supabase
    .from("slots")
    .select("fecha, hora_inicio, hora_fin, cancha_id")
    .eq("id", reserva.slot_id)
    .single();
  if (!slot) return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });

  const { data: cancha } = await supabase
    .from("canchas")
    .select("nombre, numero_sinpe")
    .eq("id", slot.cancha_id)
    .single();

  const { data: organizador } = await supabase
    .from("usuarios")
    .select("nombre")
    .eq("id", reserva.futbolero_id)
    .single();

  const { data: aportes } = await supabase
    .from("aportes")
    .select("id, nombre, estado")
    .eq("reserva_id", reserva.id)
    .order("created_at", { ascending: true });

  const montoPorAporte = Math.ceil(reserva.monto / (reserva.cantidad_aportes ?? 1));
  const confirmados = (aportes ?? []).filter((a) => a.estado === "confirmado").length;

  return NextResponse.json({
    reserva: { id: reserva.id, estado: reserva.estado, monto: reserva.monto },
    cancha: cancha ? { nombre: cancha.nombre, numeroSinpe: cancha.numero_sinpe } : null,
    slot: { fecha: slot.fecha, horaInicio: slot.hora_inicio, horaFin: slot.hora_fin },
    organizadorNombre: organizador?.nombre ?? "Tu amigo",
    cantidadAportes: reserva.cantidad_aportes ?? 0,
    montoPorAporte,
    aportesConfirmados: confirmados,
    // Solo nombre y estado — nunca teléfono ni comprobante de otros aportes acá.
    aportes: (aportes ?? []).map((a) => ({ id: a.id, nombre: a.nombre, estado: a.estado })),
  });
}
