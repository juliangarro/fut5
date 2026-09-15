import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CrearSlotForm } from "@/components/CrearSlotForm";
import { SelectorCancha } from "@/components/admin/SelectorCancha";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function NuevoSlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ canchaId: string }>;
  searchParams: Promise<{ creado?: string }>;
}) {
  const { canchaId } = await params;
  const { creado } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cancha } = await supabase
    .from("canchas")
    .select("id, nombre, admin_id")
    .eq("id", canchaId)
    .single();

  if (!cancha || cancha.admin_id !== user.id) notFound();

  const { data: misCanchas } = await supabase
    .from("canchas")
    .select("id, nombre")
    .eq("admin_id", user.id)
    .order("created_at", { ascending: true });

  const hoy = new Date().toISOString().slice(0, 10);
  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, hora_fin, precio, estado")
    .eq("cancha_id", canchaId)
    .gte("fecha", hoy)
    .order("fecha")
    .order("hora_inicio");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Horarios — {cancha.nombre}</h1>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/admin/canchas/${canchaId}/info`} />}
          >
            Info de la cancha
          </Button>
        </div>
        <SelectorCancha
          canchas={misCanchas ?? []}
          canchaActualId={canchaId}
          sufijoRuta="slots/nueva"
        />
      </div>
      {creado === "1" && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
          Horario creado.
        </p>
      )}
      <Card className="px-4">
        <CrearSlotForm canchaId={canchaId} />
      </Card>

      <h2 className="mt-2 text-lg font-medium">Próximos horarios</h2>
      <ul className="flex flex-col gap-2">
        {(slots ?? []).length === 0 && (
          <li className="text-sm text-muted-foreground">Todavía no hay horarios.</li>
        )}
        {(slots ?? []).map((slot) => (
          <li key={slot.id}>
            <Card className="flex-row items-center justify-between px-4 py-2.5">
              <span className="text-sm">
                {new Date(`${slot.fecha}T00:00:00`).toLocaleDateString("es-CR")} ·{" "}
                {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)} · ₡
                {slot.precio.toLocaleString("es-CR")}
              </span>
              <Badge variant={slot.estado === "disponible" ? "outline" : "secondary"}>
                {slot.estado}
              </Badge>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
