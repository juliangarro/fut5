import { createClient } from "@/lib/supabase/server";
import { hoyCR } from "@/lib/fecha";
import { ListaReservas, type ReservaConDatos } from "./ListaReservas";

// Activas: todavía necesitan atención o el partido no pasó (creada/en
// revisión siempre, confirmada solo si la fecha no pasó todavía). Pasadas:
// todo lo terminal (rechazada/expirada/cancelada) o confirmada con fecha ya
// jugada — ver plan-ui-ux-canchas-fut5-cr.md 5.7.
function esActiva(estado: string, fecha: string, hoy: string): boolean {
  if (estado === "creada" || estado === "pendiente_validacion") return true;
  if (estado === "confirmada") return fecha >= hoy;
  return false;
}

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
    ? await supabase.from("slots").select("id, fecha, hora_inicio, hora_fin, cancha_id").in("id", slotIds)
    : { data: [] };

  const canchaIds = [...new Set((slots ?? []).map((s) => s.cancha_id))];
  const { data: canchas } = canchaIds.length
    ? await supabase.from("canchas").select("id, nombre").in("id", canchaIds)
    : { data: [] };

  const slotPorId = new Map((slots ?? []).map((s) => [s.id, s]));
  const canchaPorId = new Map((canchas ?? []).map((c) => [c.id, c]));
  const hoy = hoyCR();

  const reservasConDatos: ReservaConDatos[] = (reservas ?? []).flatMap((reserva) => {
    const slot = slotPorId.get(reserva.slot_id);
    if (!slot) return [];
    const cancha = canchaPorId.get(slot.cancha_id);
    return [
      {
        id: reserva.id,
        estado: reserva.estado,
        canchaNombre: cancha?.nombre ?? "Cancha",
        fecha: slot.fecha,
        horaInicio: slot.hora_inicio,
        horaFin: slot.hora_fin,
        activa: esActiva(reserva.estado, slot.fecha, hoy),
      },
    ];
  });

  return <ListaReservas reservas={reservasConDatos} hoy={hoy} />;
}
