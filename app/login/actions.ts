"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { RolUsuario } from "@/lib/types/database";

// DESHABILITADO TEMPORALMENTE (ver DECISIONS.md) — login real con contraseña.
// SPEC.md 3.1.1 pide email/password + OAuth opcional; esto queda acá intacto
// para reactivarlo apenas el flujo simplificado de abajo (`entrar`) deje de
// ser necesario. No está conectado a ningún formulario activo ahora mismo.
// export async function login(_prevState: { error: string } | undefined, formData: FormData) {
//   const email = String(formData.get("email") ?? "");
//   const password = String(formData.get("password") ?? "");
//   const next = String(formData.get("next") ?? "");
//
//   if (!email || !password) {
//     return { error: "Email y contraseña son requeridos." };
//   }
//
//   const supabase = await createClient();
//   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
//
//   if (error) {
//     return { error: "Email o contraseña incorrectos." };
//   }
//
//   const { data: perfil } = await supabase
//     .from("usuarios")
//     .select("rol")
//     .eq("id", data.user.id)
//     .single();
//
//   redirect(next || (perfil?.rol === "admin_cancha" ? "/admin" : "/futbolero"));
// }

// Flujo simplificado temporal (ver DECISIONS.md): sin contraseña, sin
// verificación de que el email le pertenezca a quien lo escribe. Cualquiera
// que ingrese un email entra o crea una cuenta con ese email al instante,
// eligiendo su tipo de cuenta. Usa el service role para crear el usuario y
// generar un magic link server-side, y lo canjea en el mismo request — nunca
// se manda un email. Reemplazar por auth real antes de operar con usuarios
// reales (ver riesgo de suplantación documentado en DECISIONS.md).
export async function entrar(_prevState: { error: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const rolElegido = String(formData.get("rol") ?? "futbolero") as RolUsuario;

  if (!email || !email.includes("@")) {
    return { error: "Ingresá un email válido." };
  }
  if (rolElegido !== "futbolero" && rolElegido !== "admin_cancha") {
    return { error: "Rol inválido." };
  }

  const admin = createServiceRoleClient();

  const { data: perfilExistente } = await admin
    .from("usuarios")
    .select("id, rol")
    .eq("email", email)
    .maybeSingle();

  if (!perfilExistente) {
    const { error: errorCrear } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { rol: rolElegido },
    });
    if (errorCrear && !errorCrear.message.toLowerCase().includes("already")) {
      return { error: errorCrear.message };
    }
  }

  const { data: linkData, error: errorLink } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (errorLink || !linkData) {
    return { error: "No se pudo iniciar sesión. Intentá de nuevo." };
  }

  const supabase = await createClient();
  const { error: errorVerify } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (errorVerify) {
    return { error: "No se pudo iniciar sesión. Intentá de nuevo." };
  }

  const rolFinal = perfilExistente?.rol ?? rolElegido;
  redirect(rolFinal === "admin_cancha" ? "/admin" : "/futbolero");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
