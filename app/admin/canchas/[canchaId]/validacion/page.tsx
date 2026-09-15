import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ColaValidacion } from "@/components/ColaValidacion";

export default async function ValidacionPage({
  params,
}: {
  params: Promise<{ canchaId: string }>;
}) {
  const { canchaId } = await params;
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

  const { data: slots } = await supabase.from("slots").select("id, fecha, hora_inicio, hora_fin").eq(
    "cancha_id",
    canchaId
  );
  const slotIds = (slots ?? []).map((s) => s.id);
  const slotPorId = new Map((slots ?? []).map((s) => [s.id, s]));

  const { data: reservas } = slotIds.length
    ? await supabase
        .from("reservas")
        .select("id, futbolero_id, slot_id, monto, comprobante_url")
        .eq("estado", "pendiente_validacion")
        .in("slot_id", slotIds)
        .order("comprobante_subido_at", { ascending: true })
    : { data: [] };

  const futboleroIds = [...new Set((reservas ?? []).map((r) => r.futbolero_id))];
  const { data: futboleros } = futboleroIds.length
    ? await supabase.from("usuarios").select("id, nombre, telefono").in("id", futboleroIds)
    : { data: [] };
  const futboleroPorId = new Map((futboleros ?? []).map((f) => [f.id, f]));

  const items = await Promise.all(
    (reservas ?? []).map(async (reserva) => {
      const slot = slotPorId.get(reserva.slot_id)!;
      const futbolero = futboleroPorId.get(reserva.futbolero_id);
      let comprobanteUrlFirmada: string | null = null;
      if (reserva.comprobante_url) {
        const { data } = await supabase.storage
          .from("comprobantes")
          .createSignedUrl(reserva.comprobante_url, 300);
        comprobanteUrlFirmada = data?.signedUrl ?? null;
      }
      return {
        reservaId: reserva.id,
        futboleroNombre: futbolero?.nombre ?? "Futbolero",
        futboleroTelefono: futbolero?.telefono ?? null,
        fecha: slot.fecha,
        horaInicio: slot.hora_inicio,
        horaFin: slot.hora_fin,
        monto: reserva.monto,
        comprobanteUrlFirmada,
      };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Validar pagos — {cancha.nombre}</h1>
      <ColaValidacion items={items} />
    </div>
  );
}
