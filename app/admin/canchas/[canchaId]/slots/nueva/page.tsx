import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CrearSlotForm } from "@/components/CrearSlotForm";

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
      <h1 className="text-2xl font-semibold">Nuevo horario — {cancha.nombre}</h1>
      {creado === "1" && (
        <p className="rounded border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Horario creado.
        </p>
      )}
      <CrearSlotForm canchaId={canchaId} />

      <h2 className="mt-4 text-lg font-medium">Próximos horarios</h2>
      <ul className="flex flex-col gap-2">
        {(slots ?? []).length === 0 && (
          <li className="text-sm text-zinc-600 dark:text-zinc-400">Todavía no hay horarios.</li>
        )}
        {(slots ?? []).map((slot) => (
          <li
            key={slot.id}
            className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <span>
              {new Date(`${slot.fecha}T00:00:00`).toLocaleDateString("es-CR")} ·{" "}
              {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)} · ₡
              {slot.precio.toLocaleString("es-CR")}
            </span>
            <span className="text-zinc-500">{slot.estado}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
