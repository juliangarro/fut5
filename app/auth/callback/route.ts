import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirige acá con `?code=...` después de que el usuario resuelve un
// link de invitación, magic link o recuperación de contraseña (el link del
// email en sí apunta al endpoint hosteado de Supabase, que valida el token y
// recién después redirige al Site URL configurado con este código). Sin esta
// ruta, el código nunca se intercambia por una sesión y el usuario queda sin
// autenticar. Este proyecto no usa magic links para login normal (solo
// password), así que cualquier llegada acá es invitación o reset de
// contraseña — en ambos casos el siguiente paso lógico es fijar una
// contraseña, de ahí el default de `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
