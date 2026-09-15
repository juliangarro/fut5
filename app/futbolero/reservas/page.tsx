import Link from "next/link";
import { CalendarSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EstadoReservaBadge } from "@/components/shared/EstadoReservaBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function MisReservasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: reservas } = await supabase
    .from("reservas")
    .select("id, estado, monto, slot_id, creada_at")
    .eq("futbolero_id", user.id)
    .order("creada_at", { ascending: false });

  const slotIds = [...new Set((reservas ?? []).map((r) => r.slot_id))];
  const { data: slots } = slotIds.length
    ? await supabase.from("slots").select("id, fecha, hora_inicio, cancha_id").in("id", slotIds)
    : { data: [] };

  const canchaIds = [...new Set((slots ?? []).map((s) => s.cancha_id))];
  const { data: canchas } = canchaIds.length
    ? await supabase.from("canchas").select("id, nombre").in("id", canchaIds)
    : { data: [] };

  const slotPorId = new Map((slots ?? []).map((s) => [s.id, s]));
  const canchaPorId = new Map((canchas ?? []).map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mis reservas</h1>
      {(reservas ?? []).length === 0 ? (
        <EmptyState
          icono={CalendarSearch}
          titulo="Todavía no tenés reservas"
          descripcion="Buscá una cancha y elegí un horario."
          accion={{ texto: "Buscar una cancha", href: "/futbolero/canchas" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {(reservas ?? []).map((reserva) => {
            const slot = slotPorId.get(reserva.slot_id);
            const cancha = slot ? canchaPorId.get(slot.cancha_id) : undefined;
            return (
              <li key={reserva.id}>
                <Link
                  href={`/futbolero/reservas/${reserva.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium">{cancha?.nombre ?? "Cancha"}</p>
                    {slot && (
                      <p className="text-sm text-muted-foreground">
                        {new Date(`${slot.fecha}T00:00:00`).toLocaleDateString("es-CR")} ·{" "}
                        {slot.hora_inicio.slice(0, 5)}
                      </p>
                    )}
                  </div>
                  <EstadoReservaBadge estado={reserva.estado} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
