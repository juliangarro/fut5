import Link from "next/link";
import { redirect } from "next/navigation";
import { ImageOff, LandPlot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function CanchasAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: canchas } = await supabase
    .from("canchas")
    .select("id, nombre, rating_promedio, fotos")
    .eq("admin_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-5 px-5 pt-[52px] pb-6 lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold lg:text-[32px]">Mis canchas</h1>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/canchas/nueva" />}>
          + Nueva cancha
        </Button>
      </div>

      {(canchas ?? []).length === 0 ? (
        <EmptyState
          icono={LandPlot}
          titulo="Todavía no registraste ninguna cancha"
          descripcion="Creá tu primera cancha para empezar a recibir reservas."
          accion={{ texto: "Crear cancha", href: "/admin/canchas/nueva" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {(canchas ?? []).map((cancha) => {
            const primeraFoto = cancha.fotos?.[0];
            const fotoUrl = primeraFoto
              ? supabase.storage.from("fotos-cancha").getPublicUrl(primeraFoto).data.publicUrl
              : null;
            return (
              <li key={cancha.id}>
                <Card className="flex-row flex-wrap items-center gap-3 rounded-fila bg-background px-4 py-3.5 shadow-none">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-thumb bg-muted">
                    {fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl} alt={cancha.nombre} className="size-full object-cover washed" />
                    ) : (
                      <ImageOff className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[17px]">{cancha.nombre}</p>
                    <p className="text-sm text-muted-foreground">★ {cancha.rating_promedio.toFixed(1)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/admin/canchas/${cancha.id}/info`} />}
                    >
                      Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/admin/canchas/${cancha.id}/slots/nueva`} />}
                    >
                      Horarios
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
