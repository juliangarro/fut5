import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Invocado por Vercel Cron (ver vercel.json) para expirar Reservas
// `pendiente_validacion` cuya ventana de retención venció (SPEC.md 5.1.9).
// Usa el service role porque ningún usuario autenticado puede transicionar
// el estado de una reserva ajena — esta es una operación de sistema.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Fallar cerrado si la env var no está seteada, en vez de comparar contra
  // el literal "Bearer undefined" (que un caller podría mandar a propósito).
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("expirar_reservas_vencidas");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
