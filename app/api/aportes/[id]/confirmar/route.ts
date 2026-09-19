import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verificarPropiedadAdminAporte } from "../_ownership";

// `aportes` no tiene policy de UPDATE (ver migración 00000000000007) — la
// verificación de que quien confirma es el admin de la cancha pasa por acá
// (createClient(), con sesión), y la escritura por el service role. El
// trigger aportes_confirmar_reserva se encarga de confirmar la reserva sola
// si esta confirmación completa el monto.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: aporteId } = await params;
  const supabase = await createClient();

  const { error, status, aporte } = await verificarPropiedadAdminAporte(supabase, aporteId);
  if (error) return NextResponse.json({ error }, { status });

  if (aporte!.estado !== "comprobante_subido") {
    return NextResponse.json({ error: "Este aporte no tiene un comprobante pendiente de revisión." }, { status: 409 });
  }

  const service = createServiceRoleClient();
  const { error: errorUpdate } = await service
    .from("aportes")
    .update({ estado: "confirmado", resuelto_at: new Date().toISOString() })
    .eq("id", aporteId);

  if (errorUpdate) return NextResponse.json({ error: errorUpdate.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
