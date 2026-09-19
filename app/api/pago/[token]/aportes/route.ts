import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Crea el aporte del amigo (todavía sin comprobante). Pública, sin auth —
// ver route.ts del padre para el porqué del service role acá.
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const body = await request.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const telefono = typeof body?.telefono === "string" && body.telefono.trim() ? body.telefono.trim() : null;

  if (!nombre || nombre.length > 60) {
    return NextResponse.json({ error: "Escribí tu nombre (máximo 60 caracteres)." }, { status: 400 });
  }

  const { data: reserva } = await supabase
    .from("reservas")
    .select("id, estado, monto, modo_cobro, cantidad_aportes")
    .eq("token_cobro", token)
    .maybeSingle();

  if (!reserva || reserva.modo_cobro !== "grupal") {
    return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
  }
  if (reserva.estado !== "creada") {
    return NextResponse.json({ error: "Esta reserva ya no está aceptando pagos." }, { status: 409 });
  }

  const montoPorAporte = Math.ceil(reserva.monto / (reserva.cantidad_aportes ?? 1));

  const { data: aportesExistentes } = await supabase
    .from("aportes")
    .select("monto, estado")
    .eq("reserva_id", reserva.id)
    .neq("estado", "rechazado");

  const totalReservado = (aportesExistentes ?? []).reduce((suma, a) => suma + a.monto, 0);
  if (totalReservado + montoPorAporte > reserva.monto) {
    return NextResponse.json(
      { error: "Ya se completó el monto de esta reserva. Consultá con el organizador." },
      { status: 409 }
    );
  }

  const { data: aporte, error } = await supabase
    .from("aportes")
    .insert({ reserva_id: reserva.id, nombre, telefono, monto: montoPorAporte })
    .select("id, monto")
    .single();

  if (error || !aporte) {
    return NextResponse.json({ error: error?.message ?? "No se pudo registrar el aporte." }, { status: 500 });
  }

  return NextResponse.json({ aporteId: aporte.id, monto: aporte.monto });
}
