"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function crearCancha(_prevState: { error: string } | undefined, formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const numeroSinpe = String(formData.get("numero_sinpe") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const politicaCancelacion = String(formData.get("politica_cancelacion") ?? "").trim();

  if (!nombre || !numeroSinpe) {
    return { error: "Nombre y número SINPE son requeridos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cancha, error } = await supabase
    .from("canchas")
    .insert({
      admin_id: user.id,
      nombre,
      numero_sinpe: numeroSinpe,
      descripcion: descripcion || null,
      politica_cancelacion: politicaCancelacion || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/admin/canchas/${cancha.id}/slots/nueva`);
}
