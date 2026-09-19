import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reservaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: reserva, error: errorReserva } = await supabase
    .from("reservas")
    .select("id, futbolero_id, estado")
    .eq("id", reservaId)
    .single();

  if (errorReserva || !reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (reserva.futbolero_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (reserva.estado !== "creada") {
    // "pendiente_validacion" significa que un envío anterior de este mismo
    // futbolero ya subió el comprobante y el trigger sincronizar_estado_reserva
    // ya movió creada -> pendiente_validacion. Con mala señal (contexto real
    // en Costa Rica, ver subirConReintentos) el cliente puede no haber recibido
    // esa respuesta 200 y reintentar el mismo POST: como ya se logró el
    // objetivo (hay comprobante registrado), respondemos ok en vez de 409 para
    // que el reintento no se muestre como error. Otros estados (confirmada,
    // rechazada, expirada, cancelada) sí deben seguir rechazando el reintento.
    if (reserva.estado === "pendiente_validacion") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json(
      { error: "Esta reserva ya tiene un comprobante o ya no acepta uno." },
      { status: 409 }
    );
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

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${reservaId}/${crypto.randomUUID()}.${extension}`;

  const { error: errorUpload } = await supabase.storage
    .from("comprobantes")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (errorUpload) {
    return NextResponse.json({ error: `No se pudo subir el comprobante: ${errorUpload.message}` }, { status: 502 });
  }

  // El trigger sincronizar_estado_reserva mueve creada -> pendiente_validacion
  // y calcula expira_at al ver comprobante_url pasar de null a un valor.
  const { error: errorUpdate } = await supabase
    .from("reservas")
    .update({ comprobante_url: path })
    .eq("id", reservaId);

  if (errorUpdate) {
    await supabase.storage.from("comprobantes").remove([path]);
    return NextResponse.json({ error: errorUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
