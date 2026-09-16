import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { HojaInferior } from "@/components/shared/HojaInferior";
import { FondoDetalleCancha } from "@/components/shared/FondoDetalleCancha";
import { Aviso } from "@/components/shared/Aviso";
import { SubirComprobante } from "./SubirComprobante";
import { formatearColones } from "@/lib/formato";

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

  const hrefDetalle = `/futbolero/canchas/${canchaId}`;
  const hrefPaso1 = `/futbolero/canchas/${canchaId}/reservar/${slotId}`;

  const { data: reserva } = await supabase
    .from("reservas")
    .select("id, estado")
    .eq("slot_id", slotId)
    .eq("futbolero_id", user.id)
    .in("estado", ["creada", "pendiente_validacion"])
    .maybeSingle();

  if (!reserva) {
    return (
      <>
        <FondoDetalleCancha nombre="" fotoUrl={null} />
        <HojaInferior titulo="Todavía no confirmaste esta reserva" abierta hrefCerrar={hrefDetalle}>
          <div className="flex flex-col gap-4">
            <Aviso tono="atencion">
              Volvé a la pantalla anterior y tocá &ldquo;Ya pagué, adjuntar comprobante&rdquo;.
            </Aviso>
            <Button size="lg" className="w-full" nativeButton={false} render={<Link href={hrefPaso1} />}>
              Volver
            </Button>
          </div>
        </HojaInferior>
      </>
    );
  }

  if (reserva.estado !== "creada") {
    redirect(`/futbolero/reservas/${reserva.id}`);
  }

  // Lectura nueva: la pantalla de resumen (paso 1) ya trae esto, pero esta
  // pantalla hoy solo lee la reserva. Hace falta para mostrar el número
  // SINPE y el monto en la hoja completa del diseño.
  const { data: slot } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, hora_fin, precio, cancha_id")
    .eq("id", slotId)
    .single();

  const { data: cancha } = slot
    ? await supabase.from("canchas").select("nombre, numero_sinpe, fotos").eq("id", slot.cancha_id).single()
    : { data: null };

  const fotoUrl = cancha?.fotos?.[0]
    ? supabase.storage.from("fotos-cancha").getPublicUrl(cancha.fotos[0]).data.publicUrl
    : null;

  return (
    <>
      <FondoDetalleCancha nombre={cancha?.nombre ?? ""} fotoUrl={fotoUrl} />
      <HojaInferior titulo="Adjuntá tu comprobante" abierta hrefCerrar={hrefDetalle}>
        <div className="flex flex-col gap-4">
          {cancha && slot && (
            <>
              <div className="flex flex-col gap-2 rounded-card bg-terracota-100 px-[18px] py-4">
                <p className="kicker text-terracota-800">Número SINPE</p>
                <span className="text-[26px] font-bold text-terracota-900">{cancha.numero_sinpe}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[16px]">Monto a transferir</span>
                <span className="text-[24px] font-bold">{formatearColones(slot.precio)}</span>
              </div>
            </>
          )}

          <SubirComprobante reservaId={reserva.id} />

          <Aviso tono="info">
            Todavía no está confirmada: la cancha revisa el comprobante y te avisamos acá mismo.
          </Aviso>
        </div>
      </HojaInferior>
    </>
  );
}
