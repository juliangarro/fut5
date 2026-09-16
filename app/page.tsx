import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CanchaIlustracion } from "@/components/CanchaIlustracion";
import { Marca } from "@/components/shared/Marca";

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
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-between px-[26px] pt-[52px] pb-[34px]">
      <Marca />

      <div className="flex flex-col items-center gap-5 text-center">
        <div className="w-full overflow-hidden rounded-[32px] shadow-md">
          <CanchaIlustracion className="h-auto w-full" />
        </div>
        <h1 className="text-[34px] font-bold tracking-[-0.025em] text-balance">
          Reservá tu cancha de fut5
        </h1>
        <p className="text-[17px] text-neutral-800">
          Elegí horario, pagá por SINPE Móvil y seguí el estado de tu reserva en vivo.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" className="w-full" nativeButton={false} render={<Link href="/login" />}>
          Entrar
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href="/login?modo=crear" />}
        >
          Crear cuenta
        </Button>
      </div>
    </div>
  );
}
