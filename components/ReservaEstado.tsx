"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { ComprobanteUploader } from "./ComprobanteUploader";
import type { EstadoReserva } from "@/lib/types/database";

type ReservaVista = {
  id: string;
  estado: EstadoReserva;
  monto: number;
  motivo_rechazo: string | null;
  expira_at: string | null;
};

const ETIQUETAS_ESTADO: Record<EstadoReserva, string> = {
  creada: "Esperando pago",
  pendiente_validacion: "Comprobante en revisión",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export function ReservaEstado({
  reservaInicial,
  cancha,
  slot,
  onCancelar,
}: {
  reservaInicial: ReservaVista;
  cancha: { nombre: string; numero_sinpe: string };
  slot: { fecha: string; hora_inicio: string; hora_fin: string };
  onCancelar: (reservaId: string) => Promise<void>;
}) {
  const [reserva, setReserva] = useState(reservaInicial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`reserva-${reserva.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas", filter: `id=eq.${reserva.id}` },
        (payload) => setReserva(payload.new as ReservaVista)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">{cancha.nombre}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {new Date(`${slot.fecha}T00:00:00`).toLocaleDateString("es-CR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)}
        </p>
        <p className="mt-2 text-sm">
          Estado: <span className="font-medium">{ETIQUETAS_ESTADO[reserva.estado]}</span>
        </p>
      </div>

      {reserva.estado === "creada" && (
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm">
            Transferí <strong>₡{reserva.monto.toLocaleString("es-CR")}</strong> por SINPE Móvil al número{" "}
            <strong>{cancha.numero_sinpe}</strong> y subí el comprobante acá.
          </p>
          <ComprobanteUploader reservaId={reserva.id} />
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => onCancelar(reserva.id))}
            className="text-sm text-zinc-600 underline hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white"
          >
            Cancelar reserva
          </button>
        </div>
      )}

      {reserva.estado === "pendiente_validacion" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          El administrador de la cancha está revisando tu comprobante. Te vamos a avisar apenas lo
          confirme o rechace
          {reserva.expira_at &&
            ` (esta reserva se libera automáticamente si no hay respuesta antes de las ${new Date(
              reserva.expira_at
            ).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })})`}
          .
        </p>
      )}

      {reserva.estado === "confirmada" && (
        <p className="text-sm text-green-700 dark:text-green-400">
          ¡Reserva confirmada! Te esperamos en la cancha.
        </p>
      )}

      {reserva.estado === "rechazada" && (
        <p className="text-sm text-red-600">
          El administrador rechazó el comprobante
          {reserva.motivo_rechazo ? `: ${reserva.motivo_rechazo}` : "."}
        </p>
      )}

      {reserva.estado === "expirada" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Esta reserva expiró porque no se validó el comprobante a tiempo. El horario fue liberado.
        </p>
      )}

      {reserva.estado === "cancelada" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Cancelaste esta reserva.</p>
      )}
    </div>
  );
}
