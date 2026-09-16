import { createClient } from "@/lib/supabase/server";
import { contarPendientes } from "@/lib/admin/contarPendientes";
import { SidebarAdmin } from "@/components/admin/SidebarAdmin";
import { BarraInferior } from "@/components/BarraInferior";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nombre = "";
  let cantidadCanchas = 0;
  let pendientes = 0;

  if (user) {
    const [{ data: perfil }, { count }, conteoPendientes] = await Promise.all([
      supabase.from("usuarios").select("nombre").eq("id", user.id).single(),
      supabase.from("canchas").select("id", { count: "exact", head: true }).eq("admin_id", user.id),
      contarPendientes(supabase, user.id),
    ]);
    nombre = perfil?.nombre ?? "";
    cantidadCanchas = count ?? 0;
    pendientes = conteoPendientes.total;
  }

  const itemsBarra = [
    { href: "/admin", label: "Panel", icono: "layoutGrid" as const },
    { href: "/admin/validaciones", label: "Validaciones", icono: "clipboardCheck" as const, contador: pendientes },
    { href: "/admin/horarios", label: "Horarios", icono: "calendar" as const },
    { href: "/admin/mas", label: "Más", icono: "ellipsis" as const },
  ];

  return (
    <div className="flex min-h-dvh bg-background">
      <div className="hidden lg:block">
        <SidebarAdmin nombre={nombre} cantidadCanchas={cantidadCanchas} pendientes={pendientes} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-[calc(84px+env(safe-area-inset-bottom))] lg:mx-auto lg:w-full lg:max-w-5xl lg:px-10 lg:py-[26px] lg:pb-8">
          {children}
        </main>
        <div className="lg:hidden">
          <BarraInferior items={itemsBarra} />
        </div>
      </div>
    </div>
  );
}
