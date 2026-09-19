import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

// Sube el comprobante de un aporte puntual. El `token` en la URL (además del
// aporteId, ya un UUID random) es defensa en profundidad: sin él, alguien
// que adivinara un aporteId ajeno no podría igual confirmar que pertenece a
// esta reserva.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; aporteId: string }> }
) {
  const { token, aporteId } = await params;
  const supabase = createServiceRoleClient();

  const { data: aporte } = await supabase
    .from("aportes")
    .select("id, estado, reserva_id")
    .eq("id", aporteId)
    .maybeSingle();

  if (!aporte) {
    return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });
  }

  const { data: reserva } = await supabase
    .from("reservas")
    .select("token_cobro, estado")
    .eq("id", aporte.reserva_id)
    .single();

  if (!reserva || reserva.token_cobro !== token) {
    return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });
  }
  if (reserva.estado !== "creada") {
    return NextResponse.json({ error: "Esta reserva ya no está aceptando pagos." }, { status: 409 });
  }
  if (aporte.estado !== "pendiente" && aporte.estado !== "rechazado") {
    return NextResponse.json({ error: "Este aporte ya tiene un comprobante en revisión." }, { status: 409 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json({ error: "Formato no soportado. Usá JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 5MB." }, { status: 400 });
  }

  // El primer segmento del path tiene que ser el reserva_id: la policy
  // `comprobantes_select_dueno` (00000000000004_storage.sql) resuelve
  // propiedad castéandolo a uuid — un literal como "aportes" ahí rompe esa
  // policy para cualquiera que intente firmar la URL con su sesión (ver
  // comentario en la migración 00000000000007).
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${aporte.reserva_id}/aportes/${aporteId}/${crypto.randomUUID()}.${extension}`;

  const { error: errorUpload } = await supabase.storage
    .from("comprobantes")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (errorUpload) {
    return NextResponse.json(
      { error: `No se pudo subir el comprobante: ${errorUpload.message}` },
      { status: 502 }
    );
  }

  const { error: errorUpdate } = await supabase
    .from("aportes")
    .update({
      comprobante_url: path,
      comprobante_subido_at: new Date().toISOString(),
      estado: "comprobante_subido",
      motivo_rechazo: null,
    })
    .eq("id", aporteId);

  if (errorUpdate) {
    await supabase.storage.from("comprobantes").remove([path]);
    return NextResponse.json({ error: errorUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
