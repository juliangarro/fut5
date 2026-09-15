import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: canchas } = await supabase
    .from("canchas")
    .select("id, nombre, rating_promedio")
    .eq("admin_id", user.id)
    .order("created_at", { ascending: false });

  const canchaIds = (canchas ?? []).map((c) => c.id);

  const pendientesPorCancha = new Map<string, number>();
  if (canchaIds.length) {
    const { data: slotsPropios } = await supabase.from("slots").select("id, cancha_id").in("cancha_id", canchaIds);
    const canchaPorSlot = new Map((slotsPropios ?? []).map((s) => [s.id, s.cancha_id]));
    const slotIds = (slotsPropios ?? []).map((s) => s.id);
    if (slotIds.length) {
      const { data: pendientes } = await supabase
        .from("reservas")
        .select("slot_id")
        .eq("estado", "pendiente_validacion")
        .in("slot_id", slotIds);
      for (const reserva of pendientes ?? []) {
        const canchaId = canchaPorSlot.get(reserva.slot_id);
        if (!canchaId) continue;
        pendientesPorCancha.set(canchaId, (pendientesPorCancha.get(canchaId) ?? 0) + 1);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis canchas</h1>
        <Link href="/admin/canchas/nueva" className="text-sm font-medium underline">
          + Nueva cancha
        </Link>
      </div>
      {(canchas ?? []).length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">Todavía no registraste ninguna cancha.</p>
      )}
      <ul className="flex flex-col gap-3">
        {(canchas ?? []).map((cancha) => {
          const pendientes = pendientesPorCancha.get(cancha.id) ?? 0;
          return (
            <li
              key={cancha.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium">{cancha.nombre}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  ⭐ {cancha.rating_promedio.toFixed(1)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {pendientes > 0 && (
                  <Link
                    href={`/admin/canchas/${cancha.id}/validacion`}
                    className="rounded bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                  >
                    {pendientes} por validar
                  </Link>
                )}
                <Link href={`/admin/canchas/${cancha.id}/slots/nueva`} className="text-sm underline">
                  + Horario
                </Link>
                <Link href={`/admin/canchas/${cancha.id}/validacion`} className="text-sm underline">
                  Validaciones
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
