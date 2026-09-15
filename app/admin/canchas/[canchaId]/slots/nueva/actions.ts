"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function crearSlot(
  canchaId: string,
  _prevState: { error: string } | undefined,
  formData: FormData
) {
  const fecha = String(formData.get("fecha") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const horaFin = String(formData.get("hora_fin") ?? "");
  const precio = Number(formData.get("precio"));

  if (!fecha || !horaInicio || !horaFin || !precio || precio <= 0) {
    return { error: "Completá todos los campos con valores válidos." };
  }
  if (horaFin <= horaInicio) {
    return { error: "La hora de fin debe ser posterior a la de inicio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("slots").insert({
    cancha_id: canchaId,
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    precio,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un horario para esa cancha en esa fecha y hora." };
    }
    return { error: error.message };
  }

  revalidatePath(`/admin/canchas/${canchaId}/slots/nueva`);
  redirect(`/admin/canchas/${canchaId}/slots/nueva?creado=1`);
}
