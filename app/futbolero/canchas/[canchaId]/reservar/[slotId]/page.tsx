import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BotonCopiar } from "./BotonCopiar";
import { confirmarPago } from "./actions";

export default async function ResumenPagoPage({
  params,
}: {
  params: Promise<{ canchaId: string; slotId: string }>;
}) {
  const { canchaId, slotId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: slot } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, hora_fin, precio, estado, cancha_id")
    .eq("id", slotId)
    .single();
  if (!slot) notFound();

  const { data: cancha } = await supabase
    .from("canchas")
    .select("nombre, numero_sinpe")
    .eq("id", slot.cancha_id)
    .single();
  if (!cancha) notFound();

  // Si este futbolero ya tiene una reserva activa sobre este slot (volvió
  // atrás y confirmó de nuevo), el slot ya no figura "disponible" pero sigue
  // siendo válido continuar — no es que otro se lo haya llevado.
  const { data: reservaPropia } = await supabase
    .from("reservas")
    .select("id")
    .eq("slot_id", slotId)
    .eq("futbolero_id", user.id)
    .in("estado", ["creada", "pendiente_validacion"])
    .maybeSingle();

  const slotTomado = slot.estado !== "disponible" && !reservaPropia;
  const confirmarPagoConParams = confirmarPago.bind(null, canchaId, slotId);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/futbolero/canchas/${canchaId}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al calendario
      </Link>

      <h1 className="text-2xl font-semibold">Resumen de tu reserva</h1>

      {slotTomado ? (
        <Card className="gap-3 px-4">
          <p className="font-medium text-danger">Este horario ya no está disponible.</p>
          <p className="text-sm text-muted-foreground">
            Alguien más lo reservó mientras lo mirabas. Elegí otro horario.
          </p>
          <Button render={<Link href={`/futbolero/canchas/${canchaId}`} />} className="mt-2 w-fit">
            Ver otros horarios
          </Button>
        </Card>
      ) : (
        <>
          <Card className="gap-2 px-4">
            <p className="font-medium">{cancha.nombre}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(`${slot.fecha}T00:00:00`).toLocaleDateString("es-CR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              · {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)}
            </p>
            <p className="text-lg font-semibold">₡{slot.precio.toLocaleString("es-CR")}</p>
          </Card>

          <Card className="gap-3 border-primary/30 bg-primary/5 px-4">
            <p className="text-sm font-medium">Pagá por SINPE Móvil</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xl font-semibold tracking-wide">{cancha.numero_sinpe}</span>
              <BotonCopiar texto={cancha.numero_sinpe} />
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
              <li>
                Hacé la transferencia SINPE por <strong>₡{slot.precio.toLocaleString("es-CR")}</strong>{" "}
                al número de arriba.
              </li>
              <li>Subí el comprobante en el siguiente paso.</li>
            </ol>
          </Card>

          <form action={confirmarPagoConParams}>
            <Button type="submit" size="lg" className="h-12 w-full">
              Ya pagué, subir comprobante
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
