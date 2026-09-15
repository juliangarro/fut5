import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RatingResumen } from "@/components/shared/RatingResumen";
import { SlotPicker } from "@/components/shared/SlotPicker";
import { GaleriaFotos } from "@/components/shared/GaleriaFotos";
import { AmenidadesGrid } from "@/components/shared/AmenidadesGrid";
import { parsearAmenidades } from "@/lib/amenidades";

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

  const hoy = new Date().toISOString().slice(0, 10);
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + 14);
  const en14Dias = fechaLimite.toISOString().slice(0, 10);

  // Trae todos los estados (no solo disponible) para que el SlotPicker
  // pueda mostrar "Ocupado"/"No disponible" en vez de simplemente omitirlos.
  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, hora_fin, precio, estado")
    .eq("cancha_id", canchaId)
    .gte("fecha", hoy)
    .lte("fecha", en14Dias)
    .order("fecha")
    .order("hora_inicio");

  return (
    <div className="flex flex-col gap-6">
      <GaleriaFotos urls={fotoUrls} alt={cancha.nombre} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{cancha.nombre}</h1>
        {cancha.descripcion && (
          <p className="text-muted-foreground">{cancha.descripcion}</p>
        )}
        <div className="mt-1">
          <RatingResumen ratingPromedio={cancha.rating_promedio} />
        </div>
        {cancha.politica_cancelacion && (
          <details className="mt-2 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Ver política de cancelación
            </summary>
            <p className="mt-1">{cancha.politica_cancelacion}</p>
          </details>
        )}
      </div>

      {amenidades.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Amenidades</h2>
          <AmenidadesGrid amenidades={amenidades} />
        </div>
      )}

      {error === "slot_no_disponible" && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
          Ese horario acaba de ser reservado por otra persona. Elegí otro.
        </p>
      )}

      <div>
        <h2 className="mb-3 text-lg font-medium">Horarios disponibles</h2>
        <SlotPicker canchaId={canchaId} slots={slots ?? []} />
      </div>
    </div>
  );
}
