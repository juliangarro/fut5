"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AMENIDADES_DISPONIBLES, type AmenidadKey } from "@/lib/amenidades";

export async function actualizarCancha(
  canchaId: string,
  _prevState: { error: string } | { exito: true } | undefined,
  formData: FormData
) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const numeroSinpe = String(formData.get("numero_sinpe") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const politicaCancelacion = String(formData.get("politica_cancelacion") ?? "").trim();
  const clavesValidas = new Set(AMENIDADES_DISPONIBLES.map((a) => a.key));
  const amenidades = formData
    .getAll("amenidades")
    .filter((v): v is AmenidadKey => typeof v === "string" && clavesValidas.has(v as AmenidadKey));

  if (!nombre || !numeroSinpe) {
    return { error: "Nombre y número SINPE son requeridos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("canchas")
    .update({
      nombre,
      numero_sinpe: numeroSinpe,
      descripcion: descripcion || null,
      politica_cancelacion: politicaCancelacion || null,
      amenidades,
    })
    .eq("id", canchaId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/canchas/${canchaId}/info`);
  revalidatePath(`/futbolero/canchas/${canchaId}`);
  return { exito: true as const };
}
