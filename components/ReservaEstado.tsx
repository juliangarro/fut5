"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ComprobanteUploader } from "@/components/shared/ComprobanteUploader";
import { FotoCancha } from "@/components/shared/FotoCancha";
import { ETIQUETA_ESTADO_RESERVA, TONO_ESTADO_RESERVA } from "@/components/shared/EstadoReservaBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatearColones, formatearFechaLarga, formatearHoraDeTimestamp, formatearRangoHoras } from "@/lib/formato";
import type { EstadoReserva } from "@/lib/types/database";

type ReservaVista = {
  id: string;
  estado: EstadoReserva;
  monto: number;
  motivo_rechazo: string | null;
  expira_at: string | null;
  comprobante_subido_at: string | null;
};

const PASOS_TIMELINE = ["Reservado", "Comprobante", "Confirmado"] as const;

function pasoActual(estado: EstadoReserva) {
  if (estado === "creada") return 0;
  if (estado === "pendiente_validacion") return 1;
  if (estado === "confirmada") return 2;
  return -1; // rechazada/expirada/cancelada: la línea de tiempo no aplica
}

// Copy honesto por estado (Fase 8): nunca prometer un tiempo de respuesta
// que no controlamos ("en menos de 30 min"), sí mostrar el vencimiento real.
function queSigue(reserva: ReservaVista): string {
  switch (reserva.estado) {
    case "creada":
      return "Transferí y adjuntá el comprobante.";
    case "pendiente_validacion":
      return reserva.expira_at
        ? `La cancha lo revisa. Vence a las ${formatearHoraDeTimestamp(reserva.expira_at)} si nadie responde.`
        : "La cancha lo revisa.";
    case "confirmada":
      return "Te esperamos en la cancha.";
    case "rechazada":
      return reserva.motivo_rechazo ? `Motivo: ${reserva.motivo_rechazo}` : "El comprobante fue rechazado.";
    case "expirada":
      return "Esta reserva venció porque no se confirmó el comprobante a tiempo. El horario fue liberado.";
    case "cancelada":
      return "Cancelaste esta reserva.";
  }
}

export function ReservaEstado({
  reservaInicial,
  comprobanteUrl,
  cancha,
  slot,
  onCancelar,
}: {
  reservaInicial: ReservaVista;
  comprobanteUrl: string | null;
  cancha: { nombre: string; numero_sinpe: string; foto: string | null };
  slot: { fecha: string; hora_inicio: string; hora_fin: string };
  onCancelar: (reservaId: string) => Promise<void>;
}) {
  const router = useRouter();
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
            toast.info(`Tu reserva pasó a: ${ETIQUETA_ESTADO_RESERVA[nueva.estado]}`);
            // La URL firmada del comprobante (si cambia) solo se puede
            // refrescar releyendo el Server Component.
            router.refresh();
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
    try {
      await onCancelar(reserva.id);
      setDialogoAbierto(false);
    } catch (err) {
      // La Server Action tira si el estado cambió mientras el diálogo estaba
      // abierto (ej. ya se resolvió por otro lado) — sin este catch quedaba
      // como promesa sin manejar y no se avisaba nada.
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar la reserva.");
      setDialogoAbierto(false);
      router.refresh();
    }
  }

  const paso = pasoActual(reserva.estado);
  const tono = TONO_ESTADO_RESERVA[reserva.estado];
  const Icono = tono.icono;

  return (
    <div className="flex flex-col gap-3.5 pb-10">
      <header className={cn("flex flex-col gap-4 rounded-b-header px-[22px] pt-[52px] pb-5", tono.cabeceraFondo)}>
        <Link
          href="/futbolero/reservas"
          className="flex h-11 w-fit items-center gap-1 rounded-full pl-1 pr-3 text-[15px] font-semibold"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          Mis reservas
        </Link>

        <div className="flex items-center gap-4">
          <div className={cn("flex size-[52px] shrink-0 items-center justify-center rounded-full", tono.cabeceraCirculo)}>
            <Icono className="size-[26px] text-background" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <p className={cn("text-[22px] font-bold", tono.cabeceraTexto)}>{ETIQUETA_ESTADO_RESERVA[reserva.estado]}</p>
            <p className={cn("text-[15px]", tono.cabeceraTexto)}>{queSigue(reserva)}</p>
          </div>
        </div>

        {paso >= 0 && (
          <ol className="mt-1 flex items-center gap-1.5">
            {PASOS_TIMELINE.map((etiqueta, i) => {
              const completado = i < paso;
              const esActual = i === paso;
              return (
                <li key={etiqueta} className="flex flex-1 items-center gap-1.5">
                  <div className="flex flex-col items-center gap-1.5" style={{ width: 24 }}>
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                        completado
                          ? "bg-brand text-background"
                          : reserva.estado === "creada"
                            ? "bg-neutral-400 text-neutral-900"
                            : "bg-terracota-300 text-terracota-900"
                      )}
                    >
                      {completado ? (
                        <>
                          <Check className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">completado</span>
                        </>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={cn("text-[13px] whitespace-nowrap", esActual && "font-bold", tono.cabeceraTexto)}
                      aria-current={esActual ? "step" : undefined}
                    >
                      {etiqueta}
                    </span>
                  </div>
                  {i < PASOS_TIMELINE.length - 1 && (
                    <div
                      className={cn(
                        "h-[3px] flex-1 rounded-full",
                        completado
                          ? "bg-brand"
                          : reserva.estado === "creada"
                            ? "bg-neutral-400"
                            : "bg-terracota-300"
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </header>

      <div className="flex flex-col gap-3.5 px-[22px] pt-[18px]">
        <Card className="flex-row items-center gap-3 px-4 py-3.5">
          <FotoCancha url={cancha.foto} alt={cancha.nombre} className="size-16 shrink-0 rounded-slot" />
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-bold">{cancha.nombre}</h2>
            <p className="text-[15px] text-muted-foreground">{formatearFechaLarga(slot.fecha)}</p>
            <p className="text-[15px] text-muted-foreground">
              {formatearRangoHoras(slot.hora_inicio, slot.hora_fin)} · {formatearColones(reserva.monto)}
            </p>
          </div>
        </Card>

        {comprobanteUrl && (
          <Card className="flex-row items-center gap-3.5 px-4 py-3.5">
            <p className="kicker sr-only">Tu comprobante</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={comprobanteUrl}
              alt="Tu comprobante de pago"
              className="h-[70px] w-14 shrink-0 rounded-[16px] object-cover"
            />
            <div className="flex flex-col gap-0.5">
              <p className="kicker">Tu comprobante</p>
              <p className="text-[15px]">
                Enviado a las{" "}
                {reserva.comprobante_subido_at ? formatearHoraDeTimestamp(reserva.comprobante_subido_at) : "—"}
                {reserva.expira_at &&
                  reserva.estado === "pendiente_validacion" &&
                  `. Vence a las ${formatearHoraDeTimestamp(reserva.expira_at)} si nadie responde.`}
              </p>
            </div>
          </Card>
        )}

        {reserva.estado === "creada" && (
          <Card className="gap-4 px-4 py-4">
            <p className="text-[15px]">
              Transferí <strong>{formatearColones(reserva.monto)}</strong> por SINPE Móvil al número{" "}
              <strong>{cancha.numero_sinpe}</strong> y subí el comprobante acá.
            </p>
            <ComprobanteUploader reservaId={reserva.id} />
          </Card>
        )}

        {reserva.estado === "creada" && (
          <Button
            type="button"
            variant="outline"
            className="h-[52px] w-full"
            disabled={pending}
            onClick={() => setDialogoAbierto(true)}
          >
            Cancelar reserva
          </Button>
        )}
      </div>

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
