"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatearColones, formatearDiaCorto, formatearRangoHoras } from "@/lib/formato";

export type ItemAporte = {
  aporteId: string;
  nombre: string;
  monto: number;
  comprobanteUrlFirmada: string | null;
  canchaNombre: string;
  organizadorNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

// Cola separada de ColaValidacion (comprobante único por reserva): un aporte
// no tiene un futbolero con cuenta detrás, así que no encaja en el tipo
// ItemCola existente (nombre/teléfono vienen del formulario del amigo, no
// de `usuarios`). Ver spec de handoff — este es el "queda pendiente" que ahí
// se marcó como fuera de alcance del boceto original.
function FilaAporte({ item, hoy }: { item: ItemAporte; hoy: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogoRechazo, setDialogoRechazo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    const res = await fetch(`/api/aportes/${item.aporteId}/confirmar`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Error al confirmar.");
      return;
    }
    toast.success(`Aporte de ${item.nombre} confirmado`);
    startTransition(() => router.refresh());
  }

  async function rechazar() {
    if (!motivo.trim()) {
      setError("El motivo es requerido.");
      return;
    }
    const res = await fetch(`/api/aportes/${item.aporteId}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Error al rechazar.");
      return;
    }
    toast.success("Aporte rechazado");
    setDialogoRechazo(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-[18px] rounded-panel border border-terracota-300 bg-card px-[18px] py-4 sm:flex-row">
      {item.comprobanteUrlFirmada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.comprobanteUrlFirmada}
          alt={`Comprobante de ${item.nombre}`}
          className="h-[160px] w-[128px] shrink-0 self-center rounded-[18px] object-cover sm:self-start"
        />
      ) : (
        <div className="flex h-[160px] w-[128px] shrink-0 items-center justify-center rounded-[18px] bg-muted text-xs text-muted-foreground">
          Sin comprobante
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[17px] font-bold">{item.nombre}</p>
            <Badge variant="neutral">{item.canchaNombre}</Badge>
          </div>
          <p className="text-[14px] text-muted-foreground">
            Cobro grupal de {item.organizadorNombre} · {formatearDiaCorto(item.fecha, hoy)}{" "}
            {formatearRangoHoras(item.horaInicio, item.horaFin)}
          </p>
          <p className="text-[20px] font-bold">{formatearColones(item.monto)}</p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button type="button" variant="success" disabled={pending} onClick={confirmar} className="flex-1">
            Confirmar aporte
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setDialogoRechazo(true)}
            className="flex-1 border-terracota-400 text-terracota-800"
          >
            Rechazar
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={dialogoRechazo}
        onOpenChange={setDialogoRechazo}
        titulo="Rechazar comprobante"
        descripcion={`${item.nombre} va a ver este motivo y va a poder reintentar desde el mismo link.`}
        textoConfirmar="Confirmar rechazo"
        onConfirmar={rechazar}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`motivo-rechazo-${item.aporteId}`}>Motivo del rechazo</Label>
          <Textarea
            id={`motivo-rechazo-${item.aporteId}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. el monto no coincide"
            rows={3}
          />
          {error && <p className="text-sm text-terracota-800">{error}</p>}
        </div>
      </ConfirmDialog>
    </div>
  );
}

export function ColaAportes({ items, hoy }: { items: ItemAporte[]; hoy: string }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-[22px] pb-8">
      <h2 className="text-[20px] font-bold">Aportes de cobro grupal ({items.length})</h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <FilaAporte key={item.aporteId} item={item} hoy={hoy} />
        ))}
      </div>
    </div>
  );
}
