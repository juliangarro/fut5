import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

const RUTAS_FUTBOLERO = "/futbolero";
const RUTAS_ADMIN = "/admin";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no eliminar. auth.getUser() refresca el token si expiró.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esRutaProtegida = path.startsWith(RUTAS_FUTBOLERO) || path.startsWith(RUTAS_ADMIN);

  if (esRutaProtegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path.startsWith(RUTAS_FUTBOLERO) || path.startsWith(RUTAS_ADMIN))) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", user.id)
      .single();

    const rolEsperado = path.startsWith(RUTAS_ADMIN) ? "admin_cancha" : "futbolero";
    if (perfil && perfil.rol !== rolEsperado) {
      const url = request.nextUrl.clone();
      url.pathname = perfil.rol === "admin_cancha" ? "/admin" : "/futbolero";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
