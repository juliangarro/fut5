import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubirComprobante } from "./SubirComprobante";

// Solo lectura — nunca crea la Reserva acá (ver actions.ts del resumen de
// pago). Si no existe todavía, es porque no se pasó por esa pantalla.
export default async function SubirComprobantePage({
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

  const { data: reserva } = await supabase
    .from("reservas")
    .select("id, estado")
    .eq("slot_id", slotId)
    .eq("futbolero_id", user.id)
    .in("estado", ["creada", "pendiente_validacion"])
    .maybeSingle();

  if (!reserva) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="gap-3 px-4">
          <p className="font-medium">Todavía no confirmaste esta reserva.</p>
          <p className="text-sm text-muted-foreground">
            Volvé a la pantalla anterior y tocá &ldquo;Ya pagué, subir comprobante&rdquo;.
          </p>
          <Button
            render={<Link href={`/futbolero/canchas/${canchaId}/reservar/${slotId}`} />}
            nativeButton={false}
            className="w-fit"
          >
            Volver
          </Button>
        </Card>
      </div>
    );
  }

  if (reserva.estado !== "creada") {
    redirect(`/futbolero/reservas/${reserva.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Subí tu comprobante</h1>
      <p className="text-sm text-muted-foreground">
        Una foto o captura de pantalla de la transferencia SINPE alcanza.
      </p>
      <SubirComprobante reservaId={reserva.id} />
    </div>
  );
}
