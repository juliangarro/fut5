import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

// D6: con 1 sola cancha, ir directo a crear horario ahí. Con varias, elegir.
export default async function HorariosAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: canchas } = await supabase
    .from("canchas")
    .select("id, nombre")
    .eq("admin_id", user.id)
    .order("created_at", { ascending: false });

  if ((canchas ?? []).length === 0) {
    return (
      <div className="px-5 pt-[52px] pb-6 lg:px-0 lg:pt-0">
        <h1 className="mb-5 text-2xl font-bold lg:text-[32px]">Horarios</h1>
        <EmptyState
          icono={Calendar}
          titulo="Todavía no registraste ninguna cancha"
          descripcion="Creá una cancha antes de publicar horarios."
          accion={{ texto: "Crear cancha", href: "/admin/canchas/nueva" }}
        />
      </div>
    );
  }

  if (canchas!.length === 1) {
    redirect(`/admin/canchas/${canchas![0].id}/slots/nueva`);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-[52px] pb-6 lg:px-0 lg:pt-0">
      <h1 className="text-2xl font-bold lg:text-[32px]">Horarios</h1>
      <p className="text-[15px] text-muted-foreground">Elegí la cancha para publicar o revisar sus horarios.</p>
      <ul className="flex flex-col gap-3">
        {canchas!.map((cancha) => (
          <li key={cancha.id}>
            <Link href={`/admin/canchas/${cancha.id}/slots/nueva`}>
              <Card className="rounded-fila bg-background px-4 py-3.5 shadow-none">
                <p className="font-bold text-[17px]">{cancha.nombre}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
