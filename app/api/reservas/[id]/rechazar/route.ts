import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verificarPropiedadAdmin } from "../_ownership";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reservaId } = await params;
  const supabase = await createClient();

  const { error, status, reserva } = await verificarPropiedadAdmin(supabase, reservaId);
  if (error) return NextResponse.json({ error }, { status });

  if (reserva!.estado !== "pendiente_validacion") {
    return NextResponse.json({ error: "Esta reserva no está pendiente de validación." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const motivo = String(body.motivo ?? "").trim();
  if (!motivo) {
    return NextResponse.json({ error: "El motivo de rechazo es requerido." }, { status: 400 });
  }

  const { error: errorUpdate } = await supabase
    .from("reservas")
    .update({ estado: "rechazada", motivo_rechazo: motivo })
    .eq("id", reservaId);
  if (errorUpdate) return NextResponse.json({ error: errorUpdate.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
