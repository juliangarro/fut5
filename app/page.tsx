import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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
      <p className="text-muted-foreground">
        Reservá tu cancha y pagá por SINPE Móvil, sin vueltas.
      </p>
      <Button size="lg" className="h-11 px-6" render={<Link href="/login" />}>
        Entrar
      </Button>
    </div>
  );
}
