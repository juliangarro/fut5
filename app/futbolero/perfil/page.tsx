import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("nombre, email").eq("id", user.id).single();
  const nombre = perfil?.nombre ?? "";
  const email = perfil?.email ?? user.email ?? "";

  return (
    <div className="flex flex-col gap-6 px-5 pt-[52px] pb-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <div className="flex flex-col items-center gap-3 py-4">
        <Avatar nombre={nombre} className="size-20 text-2xl" />
        <div className="text-center">
          <p className="text-lg font-bold">{nombre}</p>
          <p className="text-[15px] text-muted-foreground">{email}</p>
        </div>
      </div>

      <form action={logout}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Salir
        </Button>
      </form>
    </div>
  );
}
