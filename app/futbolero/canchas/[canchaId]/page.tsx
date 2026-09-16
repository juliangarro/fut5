import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SlotPicker } from "@/components/shared/SlotPicker";
import { GaleriaFotos } from "@/components/shared/GaleriaFotos";
import { AmenidadesGrid } from "@/components/shared/AmenidadesGrid";
import { Aviso } from "@/components/shared/Aviso";
import { parsearAmenidades } from "@/lib/amenidades";
import { hoyCR, sumarDiasCR } from "@/lib/fecha";
import { calcularFranjaMasPedida } from "@/lib/franjas";

export default async function CanchaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ canchaId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { canchaId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: cancha } = await supabase
    .from("canchas")
    .select("id, nombre, descripcion, politica_cancelacion, rating_promedio, amenidades, fotos")
    .eq("id", canchaId)
    .single();

  if (!cancha) notFound();

  const fotoUrls = (cancha.fotos ?? []).map(
    (path) => supabase.storage.from("fotos-cancha").getPublicUrl(path).data.publicUrl
  );
  const amenidades = parsearAmenidades(cancha.amenidades);

  const hoy = hoyCR();
  const en14Dias = sumarDiasCR(hoy, 14);

  // Trae todos los estados (no solo disponible) para que el SlotPicker
  // pueda mostrar "Ocupado"/"No disponible" en vez de simplemente omitirlos,
  // y para que D13 (franja más pedida) pueda medir ocupación real.
  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, hora_fin, precio, estado")
    .eq("cancha_id", canchaId)
    .gte("fecha", hoy)
    .lte("fecha", en14Dias)
    .order("fecha")
    .order("hora_inicio");

  const franjaMasPedida = calcularFranjaMasPedida(slots ?? []);

  return (
    <div className="flex flex-col">
      <GaleriaFotos urls={fotoUrls} alt={cancha.nombre} />

      <div className="relative -mt-[26px] flex flex-col gap-3.5 rounded-t-header bg-background px-5 pt-5 pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[25px] font-bold">{cancha.nombre}</h1>
          <div className="flex items-center gap-1.5 text-[15px]">
            {cancha.rating_promedio > 0 ? (
              <>
                <Star className="size-4 shrink-0 fill-brand stroke-brand" />
                <span className="font-bold">{cancha.rating_promedio.toFixed(1)}</span>
              </>
            ) : (
              <span className="font-bold">Nueva</span>
            )}
            {cancha.descripcion && <span className="text-neutral-800">· {cancha.descripcion}</span>}
          </div>
          {cancha.politica_cancelacion && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[15px] font-semibold text-terracota-700">
                Ver política de cancelación
              </summary>
              <div className="mt-2 rounded-slot bg-neutral-100 px-4 py-3 text-[14px] text-neutral-800">
                {cancha.politica_cancelacion}
              </div>
            </details>
          )}
        </div>

        {amenidades.length > 0 && <AmenidadesGrid amenidades={amenidades} />}

        {error === "slot_no_disponible" && (
          <Aviso tono="atencion">Ese horario acaba de ser reservado por otra persona. Elegí otro.</Aviso>
        )}

        <div className="mt-1 flex flex-col gap-3">
          <h2 className="text-lg font-bold">Horarios disponibles</h2>
          <SlotPicker canchaId={canchaId} slots={slots ?? []} franjaMasPedida={franjaMasPedida} />
        </div>
      </div>
    </div>
  );
}
