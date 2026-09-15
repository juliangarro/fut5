"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ComprobanteUploader } from "@/components/shared/ComprobanteUploader";
import { EstadoReservaBadge } from "@/components/shared/EstadoReservaBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EstadoReserva } from "@/lib/types/database";

type ReservaVista = {
  id: string;
  estado: EstadoReserva;
  monto: number;
  motivo_rechazo: string | null;
  expira_at: string | null;
};

const PASOS_TIMELINE = ["Reservado", "Comprobante subido", "Confirmado"] as const;

function pasoActual(estado: EstadoReserva) {
  if (estado === "creada") return 0;
  if (estado === "pendiente_validacion") return 1;
  if (estado === "confirmada") return 2;
  return -1; // rechazada/expirada/cancelada: la línea de tiempo no aplica
}

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
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`reserva-${reserva.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas", filter: `id=eq.${reserva.id}` },
        (payload) => {
          const nueva = payload.new as ReservaVista;
          if (nueva.estado !== reserva.estado) {
            toast.info(`Tu reserva pasó a: ${nueva.estado.replace("_", " ")}`);
          }
          setReserva(nueva);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmarCancelacion() {
    await onCancelar(reserva.id);
    setDialogoAbierto(false);
  }

  const paso = pasoActual(reserva.estado);

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">{cancha.nombre}</h2>
            <p className="text-sm text-muted-foreground">
              {new Date(`${slot.fecha}T00:00:00`).toLocaleDateString("es-CR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              · {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)}
            </p>
          </div>
          <EstadoReservaBadge estado={reserva.estado} />
        </div>

        {paso >= 0 && (
          <ol className="mt-2 flex items-center gap-1">
            {PASOS_TIMELINE.map((etiqueta, i) => (
              <li key={etiqueta} className="flex flex-1 items-center gap-1">
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
                    i <= paso ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < paso ? <Check className="size-3" /> : i + 1}
                </div>
                {i < PASOS_TIMELINE.length - 1 && (
                  <div className={cn("h-0.5 flex-1", i < paso ? "bg-primary" : "bg-muted")} />
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {reserva.estado === "creada" && (
        <Card className="gap-4 px-4">
          <p className="text-sm">
            Transferí <strong>₡{reserva.monto.toLocaleString("es-CR")}</strong> por SINPE Móvil al
            número <strong>{cancha.numero_sinpe}</strong> y subí el comprobante acá.
          </p>
          <ComprobanteUploader reservaId={reserva.id} />
          <Button
            type="button"
            variant="ghost"
            className="w-fit text-muted-foreground"
            disabled={pending}
            onClick={() => setDialogoAbierto(true)}
          >
            Cancelar reserva
          </Button>
        </Card>
      )}

      {reserva.estado === "pendiente_validacion" && (
        <p className="text-sm text-muted-foreground">
          El administrador de la cancha está revisando tu comprobante. Normalmente confirma en
          menos de 30 minutos
          {reserva.expira_at &&
            ` (vence a las ${new Date(reserva.expira_at).toLocaleTimeString("es-CR", {
              hour: "2-digit",
              minute: "2-digit",
            })} si no hay respuesta)`}
          .
        </p>
      )}

      {reserva.estado === "confirmada" && (
        <p className="text-sm text-success">¡Reserva confirmada! Te esperamos en la cancha.</p>
      )}

      {reserva.estado === "rechazada" && (
        <p className="text-sm text-danger">
          El administrador rechazó el comprobante
          {reserva.motivo_rechazo ? `: ${reserva.motivo_rechazo}` : "."}
        </p>
      )}

      {reserva.estado === "expirada" && (
        <p className="text-sm text-muted-foreground">
          Esta reserva venció porque no se confirmó el comprobante a tiempo. El horario fue
          liberado.
        </p>
      )}

      {reserva.estado === "cancelada" && (
        <p className="text-sm text-muted-foreground">Cancelaste esta reserva.</p>
      )}

      <ConfirmDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        titulo="¿Cancelar esta reserva?"
        descripcion="El horario se libera y otra persona podrá reservarlo."
        textoConfirmar="Sí, cancelar"
        textoCancelar="No, volver"
        cargando={pending}
        onConfirmar={() => startTransition(confirmarCancelacion)}
      />
    </div>
  );
}
