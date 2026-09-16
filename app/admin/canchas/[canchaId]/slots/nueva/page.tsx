import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hoyCR } from "@/lib/fecha";
import { CrearSlotForm } from "@/components/CrearSlotForm";
import { SelectorCancha } from "@/components/admin/SelectorCancha";
import { BotonVolver } from "@/components/shared/BotonVolver";
import { Aviso } from "@/components/shared/Aviso";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatearColones, formatearDiaCorto, formatearRangoHoras } from "@/lib/formato";

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

  const hoy = hoyCR();
  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, hora_fin, precio, estado")
    .eq("cancha_id", canchaId)
    .gte("fecha", hoy)
    .order("fecha")
    .order("hora_inicio");

  return (
    <div className="flex max-w-lg flex-col gap-5 px-[22px] pt-[52px] pb-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BotonVolver href="/admin" aria-label="Volver al panel" />
            <h1 className="text-[24px] font-bold">Horarios — {cancha.nombre}</h1>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/admin/canchas/${canchaId}/info`} />}>
            Info de la cancha
          </Button>
        </div>
        <SelectorCancha canchas={misCanchas ?? []} canchaActualId={canchaId} sufijoRuta="slots/nueva" />
      </div>

      {creado === "1" && <Aviso tono="exito">Horario creado.</Aviso>}

      <Card className="px-5 py-5">
        <CrearSlotForm canchaId={canchaId} />
      </Card>

      <h2 className="mt-2 text-[19px] font-bold">Próximos horarios</h2>
      <ul className="flex flex-col gap-2">
        {(slots ?? []).length === 0 && (
          <li className="text-[15px] text-muted-foreground">Todavía no hay horarios.</li>
        )}
        {(slots ?? []).map((slot) => (
          <li key={slot.id}>
            <Card className="flex-row items-center justify-between px-4 py-3">
              <span className="text-[15px]">
                {formatearDiaCorto(slot.fecha, hoy)} · {formatearRangoHoras(slot.hora_inicio, slot.hora_fin)} ·{" "}
                {formatearColones(slot.precio)}
              </span>
              <Badge variant={slot.estado === "disponible" ? "outline" : "secondary"}>{slot.estado}</Badge>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
