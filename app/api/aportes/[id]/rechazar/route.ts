import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verificarPropiedadAdminAporte } from "../_ownership";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: aporteId } = await params;
  const supabase = await createClient();

  const { error, status, aporte } = await verificarPropiedadAdminAporte(supabase, aporteId);
  if (error) return NextResponse.json({ error }, { status });

  if (aporte!.estado !== "comprobante_subido") {
    return NextResponse.json({ error: "Este aporte no tiene un comprobante pendiente de revisión." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
  if (!motivo) {
    return NextResponse.json({ error: "El motivo es requerido." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  // El endpoint de subida de comprobante del amigo acepta re-subir mientras
  // el aporte esté en 'pendiente' o 'rechazado' (ver ese route.ts), así que
  // rechazar no bloquea reintentar desde el mismo link.
  const { error: errorUpdate } = await service
    .from("aportes")
    .update({ estado: "rechazado", motivo_rechazo: motivo, resuelto_at: new Date().toISOString() })
    .eq("id", aporteId);

  if (errorUpdate) return NextResponse.json({ error: errorUpdate.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
