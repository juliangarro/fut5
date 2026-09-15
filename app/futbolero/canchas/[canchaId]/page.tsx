import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reservarSlot } from "./actions";

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

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
    .select("id, nombre, descripcion, numero_sinpe, politica_cancelacion, rating_promedio")
    .eq("id", canchaId)
    .single();

  if (!cancha) notFound();

  const ahora = new Date();
  const hoy = ahora.toISOString().slice(0, 10);
  const fechaLimite = new Date(ahora);
  fechaLimite.setDate(fechaLimite.getDate() + 14);
  const en14Dias = fechaLimite.toISOString().slice(0, 10);

  const { data: slots } = await supabase
    .from("slots")
    .select("id, fecha, hora_inicio, hora_fin, precio")
    .eq("cancha_id", canchaId)
    .eq("estado", "disponible")
    .gte("fecha", hoy)
    .lte("fecha", en14Dias)
    .order("fecha")
    .order("hora_inicio");

  const slotsPorFecha = new Map<string, typeof slots>();
  for (const slot of slots ?? []) {
    if (!slotsPorFecha.has(slot.fecha)) slotsPorFecha.set(slot.fecha, []);
    slotsPorFecha.get(slot.fecha)!.push(slot);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{cancha.nombre}</h1>
        {cancha.descripcion && (
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">{cancha.descripcion}</p>
        )}
        <p className="mt-1 text-sm">⭐ {cancha.rating_promedio.toFixed(1)}</p>
        {cancha.politica_cancelacion && (
          <p className="mt-2 text-sm text-zinc-500">
            Política de cancelación: {cancha.politica_cancelacion}
          </p>
        )}
      </div>

      {error === "slot_no_disponible" && (
        <p className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Ese horario acaba de ser reservado por otra persona. Elegí otro.
        </p>
      )}

      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-medium">Horarios disponibles (próximos 14 días)</h2>
        {slotsPorFecha.size === 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">No hay horarios disponibles.</p>
        )}
        {[...slotsPorFecha.entries()].map(([fecha, slotsDelDia]) => (
          <div key={fecha}>
            <h3 className="mb-2 text-sm font-medium capitalize text-zinc-600 dark:text-zinc-400">
              {formatearFecha(fecha)}
            </h3>
            <div className="flex flex-wrap gap-2">
              {slotsDelDia!.map((slot) => (
                <form key={slot.id} action={reservarSlot}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-black dark:border-zinc-700 dark:hover:border-white"
                  >
                    {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)} · ₡
                    {slot.precio.toLocaleString("es-CR")}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
