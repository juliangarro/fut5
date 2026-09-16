import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { HojaInferior } from "@/components/shared/HojaInferior";
import { FondoDetalleCancha } from "@/components/shared/FondoDetalleCancha";
import { Aviso } from "@/components/shared/Aviso";
import { BotonCopiar } from "./BotonCopiar";
import { confirmarPago } from "./actions";
import { formatearColones, formatearDiaCorto, formatearRangoHoras } from "@/lib/formato";
import { hoyCR } from "@/lib/fecha";

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
    .select("nombre, numero_sinpe, fotos")
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

  const fotoUrl = cancha.fotos?.[0]
    ? supabase.storage.from("fotos-cancha").getPublicUrl(cancha.fotos[0]).data.publicUrl
    : null;

  const diaCorto = formatearDiaCorto(slot.fecha, hoyCR());
  const diaCapitalizado = diaCorto.charAt(0).toUpperCase() + diaCorto.slice(1);
  const hrefDetalle = `/futbolero/canchas/${canchaId}`;

  return (
    <>
      <FondoDetalleCancha nombre={cancha.nombre} fotoUrl={fotoUrl} />
      <HojaInferior
        titulo={slotTomado ? "Horario no disponible" : "Pagá por SINPE Móvil"}
        abierta
        hrefCerrar={hrefDetalle}
      >
        {slotTomado ? (
          <div className="flex flex-col gap-4">
            <Aviso tono="atencion">
              Este horario ya no está disponible. Alguien más lo reservó mientras lo mirabas.
            </Aviso>
            <Button size="lg" className="w-full" nativeButton={false} render={<Link href={hrefDetalle} />}>
              Ver otros horarios
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="-mt-2 text-[14px] text-neutral-800">
              {diaCapitalizado} {formatearRangoHoras(slot.hora_inicio, slot.hora_fin)} · {cancha.nombre}
            </p>

            <div className="flex flex-col gap-2 rounded-card bg-terracota-100 px-[18px] py-4">
              <p className="kicker text-terracota-800">Número SINPE</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[26px] font-bold text-terracota-900">{cancha.numero_sinpe}</span>
                <BotonCopiar texto={cancha.numero_sinpe} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[16px]">Monto a transferir</span>
              <span className="text-[24px] font-bold">{formatearColones(slot.precio)}</span>
            </div>

            <Aviso tono="info">
              Hacé la transferencia y después adjuntá el comprobante. Tu horario queda apartado cuando
              tocás el botón.
            </Aviso>

            <form action={confirmarPagoConParams}>
              <Button type="submit" size="lg" className="w-full">
                Ya pagué, adjuntar comprobante
              </Button>
            </form>
          </div>
        )}
      </HojaInferior>
    </>
  );
}
