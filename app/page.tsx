import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CanchaIlustracion } from "@/components/CanchaIlustracion";

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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6 py-12 text-center">
      <CanchaIlustracion className="mx-auto h-auto w-full max-w-64 text-primary" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-balance">Dale Cancha</h1>
        <p className="text-muted-foreground">
          Reservá tu cancha y pagá por SINPE Móvil, sin vueltas.
        </p>
      </div>
      <Button size="lg" className="h-11 px-6" nativeButton={false} render={<Link href="/login" />}>
        Entrar
      </Button>
    </div>
  );
}
