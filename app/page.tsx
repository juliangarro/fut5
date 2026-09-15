import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", user.id)
      .single();
    redirect(perfil?.rol === "admin_cancha" ? "/admin" : "/futbolero");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold">Canchas Fútbol 5 — Costa Rica</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Reservá tu cancha y pagá por SINPE Móvil, sin vueltas.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-black px-5 py-2.5 text-white dark:bg-white dark:text-black">
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="rounded border border-zinc-300 px-5 py-2.5 dark:border-zinc-700"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
