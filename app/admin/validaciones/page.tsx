import { createClient } from "@/lib/supabase/server";
import { hoyCR } from "@/lib/fecha";
import { obtenerUrlComprobanteFirmada } from "@/lib/obtenerUrlComprobanteFirmada";
import { ColaValidacion, type ItemCola } from "@/components/ColaValidacion";
import { ColaAportes, type ItemAporte } from "@/components/ColaAportes";

// Cola global: agrega pendiente_validacion de TODAS las canchas del admin
// (doc plan-ui-ux-canchas-fut5-cr.md 6.2) — es la pantalla de mayor
// frecuencia de uso, por eso no está recortada por cancha individual.
export default async function ValidacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: canchas } = await supabase
    .from("canchas")
    .select("id, nombre")
    .eq("admin_id", user.id);
  const canchaPorId = new Map((canchas ?? []).map((c) => [c.id, c]));
  const canchaIds = (canchas ?? []).map((c) => c.id);

  const { data: slots } = canchaIds.length
    ? await supabase
        .from("slots")
        .select("id, fecha, hora_inicio, hora_fin, cancha_id")
        .in("cancha_id", canchaIds)
    : { data: [] };
  const slotPorId = new Map((slots ?? []).map((s) => [s.id, s]));
  const slotIds = (slots ?? []).map((s) => s.id);

  const { data: reservas } = slotIds.length
    ? await supabase
        .from("reservas")
        .select("id, futbolero_id, slot_id, monto, comprobante_url, expira_at")
        .eq("estado", "pendiente_validacion")
        .in("slot_id", slotIds)
        .order("comprobante_subido_at", { ascending: true })
    : { data: [] };

  const futboleroIds = [...new Set((reservas ?? []).map((r) => r.futbolero_id))];
  const { data: futboleros } = futboleroIds.length
    ? await supabase.from("usuarios").select("id, nombre, telefono").in("id", futboleroIds)
    : { data: [] };
  const futboleroPorId = new Map((futboleros ?? []).map((f) => [f.id, f]));

  const items: ItemCola[] = await Promise.all(
    (reservas ?? []).map(async (reserva) => {
      const slot = slotPorId.get(reserva.slot_id)!;
      const cancha = canchaPorId.get(slot.cancha_id);
      const futbolero = futboleroPorId.get(reserva.futbolero_id);
      const comprobanteUrlFirmada = reserva.comprobante_url
        ? await obtenerUrlComprobanteFirmada(supabase, reserva.comprobante_url, reserva.id)
        : null;
      return {
        reservaId: reserva.id,
        canchaId: slot.cancha_id,
        canchaNombre: cancha?.nombre ?? "Cancha",
        futboleroNombre: futbolero?.nombre ?? "Futbolero",
        futboleroTelefono: futbolero?.telefono ?? null,
        fecha: slot.fecha,
        horaInicio: slot.hora_inicio,
        horaFin: slot.hora_fin,
        monto: reserva.monto,
        comprobanteUrlFirmada,
        expiraAt: reserva.expira_at,
      };
    })
  );

  const { data: reservasGrupales } = slotIds.length
    ? await supabase
        .from("reservas")
        .select("id, futbolero_id, slot_id")
        .eq("modo_cobro", "grupal")
        .eq("estado", "creada")
        .in("slot_id", slotIds)
    : { data: [] };
  const reservaGrupalPorId = new Map((reservasGrupales ?? []).map((r) => [r.id, r]));
  const reservaGrupalIds = (reservasGrupales ?? []).map((r) => r.id);

  const { data: aportesPendientes } = reservaGrupalIds.length
    ? await supabase
        .from("aportes")
        .select("id, reserva_id, nombre, monto, comprobante_url")
        .eq("estado", "comprobante_subido")
        .in("reserva_id", reservaGrupalIds)
        .order("comprobante_subido_at", { ascending: true })
    : { data: [] };

  const organizadorIds = [
    ...new Set((reservasGrupales ?? []).map((r) => r.futbolero_id)),
  ];
  const { data: organizadores } = organizadorIds.length
    ? await supabase.from("usuarios").select("id, nombre").in("id", organizadorIds)
    : { data: [] };
  const organizadorPorId = new Map((organizadores ?? []).map((o) => [o.id, o]));

  const itemsAportes: ItemAporte[] = await Promise.all(
    (aportesPendientes ?? []).map(async (aporte) => {
      const reservaGrupal = reservaGrupalPorId.get(aporte.reserva_id)!;
      const slot = slotPorId.get(reservaGrupal.slot_id)!;
      const cancha = canchaPorId.get(slot.cancha_id);
      const organizador = organizadorPorId.get(reservaGrupal.futbolero_id);
      const comprobanteUrlFirmada = aporte.comprobante_url
        ? await obtenerUrlComprobanteFirmada(supabase, aporte.comprobante_url, aporte.reserva_id)
        : null;
      return {
        aporteId: aporte.id,
        nombre: aporte.nombre,
        monto: aporte.monto,
        comprobanteUrlFirmada,
        canchaNombre: cancha?.nombre ?? "Cancha",
        organizadorNombre: organizador?.nombre ?? "Futbolero",
        fecha: slot.fecha,
        horaInicio: slot.hora_inicio,
        horaFin: slot.hora_fin,
      };
    })
  );

  return (
    <>
      <ColaValidacion items={items} hoy={hoyCR()} />
      <ColaAportes items={itemsAportes} hoy={hoyCR()} />
    </>
  );
}
