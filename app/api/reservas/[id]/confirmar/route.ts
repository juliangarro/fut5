import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verificarPropiedadAdmin } from "../_ownership";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reservaId } = await params;
  const supabase = await createClient();

  const { error, status, reserva } = await verificarPropiedadAdmin(supabase, reservaId);
  if (error) return NextResponse.json({ error }, { status });

  if (reserva!.estado !== "pendiente_validacion") {
    return NextResponse.json({ error: "Esta reserva no está pendiente de validación." }, { status: 409 });
  }

  const { error: errorUpdate } = await supabase
    .from("reservas")
    .update({ estado: "confirmada" })
    .eq("id", reservaId);
  if (errorUpdate) return NextResponse.json({ error: errorUpdate.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
