"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RolUsuario } from "@/lib/types/database";

type EstadoRegistro = { error: string } | { exitoRequiereConfirmacion: true } | undefined;

export async function registrar(
  _prevState: EstadoRegistro,
  formData: FormData
): Promise<EstadoRegistro> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "");
  const rol = String(formData.get("rol") ?? "futbolero") as RolUsuario;

  if (!email || !password || !nombre) {
    return { error: "Completá todos los campos." };
  }
  if (rol !== "futbolero" && rol !== "admin_cancha") {
    return { error: "Rol inválido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, rol } },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { exitoRequiereConfirmacion: true };
  }

  redirect(rol === "admin_cancha" ? "/admin" : "/futbolero");
}
