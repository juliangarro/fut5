import Link from "next/link";
import { ClipboardCheck, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: canchas } = await supabase
    .from("canchas")
    .select("id, nombre, rating_promedio, fotos")
    .eq("admin_id", user.id)
    .order("created_at", { ascending: false });

  const canchaIds = (canchas ?? []).map((c) => c.id);

  let totalPendientes = 0;
  if (canchaIds.length) {
    const { data: slotsPropios } = await supabase.from("slots").select("id").in("cancha_id", canchaIds);
    const slotIds = (slotsPropios ?? []).map((s) => s.id);
    if (slotIds.length) {
      const { count } = await supabase
        .from("reservas")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente_validacion")
        .in("slot_id", slotIds);
      totalPendientes = count ?? 0;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Panel</h1>

      <Link href="/admin/validaciones">
        <Card
          className={
            totalPendientes > 0
              ? "flex-row items-center justify-between border-warning/30 bg-warning/10 px-4 py-4"
              : "flex-row items-center justify-between px-4 py-4"
          }
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck
              className={totalPendientes > 0 ? "size-6 text-warning" : "size-6 text-muted-foreground"}
            />
            <div>
              <p className="font-medium">
                {totalPendientes > 0
                  ? `${totalPendientes} comprobante${totalPendientes > 1 ? "s" : ""} por validar`
                  : "No hay comprobantes pendientes"}
              </p>
              <p className="text-sm text-muted-foreground">Ver cola de validaciones</p>
            </div>
          </div>
        </Card>
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Mis canchas</h2>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/canchas/nueva" />}>
          + Nueva cancha
        </Button>
      </div>

      {(canchas ?? []).length === 0 ? (
        <EmptyState
          icono={ClipboardCheck}
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
                <Card className="flex-row flex-wrap items-center gap-3 px-3 py-3">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl} alt={cancha.nombre} className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{cancha.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      ⭐ {cancha.rating_promedio.toFixed(1)}
                    </p>
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
