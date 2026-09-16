import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { BarraInferior } from "@/components/BarraInferior";

const LINKS = [
  { href: "/futbolero/canchas", label: "Buscar" },
  { href: "/futbolero/reservas", label: "Mis reservas" },
  { href: "/futbolero/perfil", label: "Perfil" },
];

const ITEMS_BARRA = [
  { href: "/futbolero/canchas", label: "Buscar", icono: "search" as const },
  { href: "/futbolero/reservas", label: "Mis reservas", icono: "calendar" as const },
  { href: "/futbolero/perfil", label: "Perfil", icono: "user" as const },
];

export default async function FutboleroLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nombre = "";
  if (user) {
    const { data: perfil } = await supabase.from("usuarios").select("nombre").eq("id", user.id).single();
    nombre = perfil?.nombre ?? "";
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="hidden md:block">
        <NavBar links={LINKS} nombre={nombre} />
      </div>
      <main className="pb-[calc(84px+env(safe-area-inset-bottom))] md:mx-auto md:max-w-5xl md:pb-8">
        {children}
      </main>
      <div className="md:hidden">
        <BarraInferior items={ITEMS_BARRA} ocultarEnSubrutas />
      </div>
    </div>
  );
}
