"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheckBig, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ContadorExpiracion } from "@/components/shared/ContadorExpiracion";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatearColones, formatearDiaCorto, formatearRangoHoras } from "@/lib/formato";
import { cn } from "@/lib/utils";

export type ItemCola = {
  reservaId: string;
  canchaId: string;
  canchaNombre: string;
  futboleroNombre: string;
  futboleroTelefono: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  monto: number;
  comprobanteUrlFirmada: string | null;
  expiraAt: string | null;
};

function minutosRestantes(expiraAt: string | null): number | null {
  if (!expiraAt) return null;
  return Math.round((new Date(expiraAt).getTime() - Date.now()) / 60000);
}

// Texto plano "vence en 24 min" para el resumen de la fila colapsada — a
// diferencia de ContadorExpiracion (píldora), esto es parte de una oración.
function useTextoVence(expiraAt: string | null): string {
  const [minutos, setMinutos] = useState(() => minutosRestantes(expiraAt));
  useEffect(() => {
    const id = setInterval(() => setMinutos(minutosRestantes(expiraAt)), 15000);
    return () => clearInterval(id);
  }, [expiraAt]);
  if (minutos === null) return "";
  return minutos <= 0 ? "venciendo…" : `vence en ${minutos} min`;
}

function ItemExpandido({ item, hoy }: { item: ItemCola; hoy: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogoRechazo, setDialogoRechazo] = useState(false);
  const [comprobanteAbierto, setComprobanteAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null);
    const res = await fetch(`/api/reservas/${item.reservaId}/confirmar`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Error al confirmar.");
      return;
    }
    toast.success("Reserva confirmada");
    startTransition(() => router.refresh());
  }

  async function rechazar() {
    if (!motivo.trim()) {
      setError("El motivo es requerido.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/reservas/${item.reservaId}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Error al rechazar.");
      return;
    }
    toast.success("Reserva rechazada");
    setDialogoRechazo(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-[22px] rounded-panel border border-terracota-300 bg-card px-[22px] py-5 sm:flex-row">
      {item.comprobanteUrlFirmada ? (
        <button
          type="button"
          onClick={() => setComprobanteAbierto(true)}
          className="h-[214px] w-[168px] shrink-0 self-center overflow-hidden rounded-[22px] sm:self-start"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.comprobanteUrlFirmada}
            alt="Comprobante de pago SINPE — tocar para ver a tamaño completo"
            className="size-full object-cover"
          />
        </button>
      ) : (
        <div className="flex h-[214px] w-[168px] shrink-0 items-center justify-center rounded-[22px] bg-muted text-sm text-muted-foreground">
          Sin comprobante
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[20px] font-bold">{item.futboleroNombre}</p>
            <Badge variant="neutral">{item.canchaNombre}</Badge>
          </div>
          <p className="text-[15px] text-muted-foreground">
            {item.futboleroTelefono ? `${item.futboleroTelefono} · ` : ""}
            {formatearDiaCorto(item.fecha, hoy)} {formatearRangoHoras(item.horaInicio, item.horaFin)}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-[24px] font-bold">{formatearColones(item.monto)}</p>
            <ContadorExpiracion expiraAt={item.expiraAt} formato="corto" />
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-slot bg-background px-4 py-3">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-terracota-700" aria-hidden="true" />
          <p className="text-sm text-neutral-800">
            Revisá que el monto sea {formatearColones(item.monto)} y que la fecha de la transferencia
            sea reciente antes de confirmar.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="success"
            size="lg"
            disabled={pending}
            onClick={confirmar}
            className="flex-1"
          >
            Confirmar reserva
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={() => setDialogoRechazo(true)}
            className="flex-1 border-terracota-400 text-terracota-800"
          >
            Rechazar con motivo
          </Button>
        </div>
      </div>

      <Dialog open={comprobanteAbierto} onOpenChange={setComprobanteAbierto}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="sr-only">Comprobante de {item.futboleroNombre}</DialogTitle>
          {item.comprobanteUrlFirmada && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.comprobanteUrlFirmada}
              alt="Comprobante de pago SINPE a tamaño completo"
              className="w-full rounded-[20px] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialogoRechazo}
        onOpenChange={setDialogoRechazo}
        titulo="Rechazar comprobante"
        descripcion="El futbolero va a ver este motivo y el horario se libera."
        textoConfirmar="Confirmar rechazo"
        onConfirmar={rechazar}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="motivo-rechazo">Motivo del rechazo</Label>
          <Textarea
            id="motivo-rechazo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. el monto no coincide con el precio del horario"
            rows={3}
          />
          {error && <p className="text-sm text-terracota-800">{error}</p>}
        </div>
      </ConfirmDialog>
    </div>
  );
}

function FilaColapsada({ item, hoy, onAbrir }: { item: ItemCola; hoy: string; onAbrir: () => void }) {
  const textoVence = useTextoVence(item.expiraAt);

  return (
    <div className="flex items-center gap-5 rounded-panel bg-card px-[22px] py-[18px]">
      <div className="size-[74px] shrink-0 overflow-hidden rounded-slot bg-muted">
        {item.comprobanteUrlFirmada && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.comprobanteUrlFirmada} alt="" className="size-full object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[18px] font-bold">{item.futboleroNombre}</p>
          <Badge variant="neutral">{item.canchaNombre}</Badge>
        </div>
        <p className="text-[15px] text-muted-foreground">
          {formatearDiaCorto(item.fecha, hoy)} {formatearRangoHoras(item.horaInicio, item.horaFin)} ·{" "}
          {formatearColones(item.monto)}
          {textoVence && ` · ${textoVence}`}
        </p>
      </div>
      <Button type="button" variant="ghost" onClick={onAbrir} aria-expanded={false}>
        Abrir
      </Button>
    </div>
  );
}

export function ColaValidacion({ items, hoy }: { items: ItemCola[]; hoy: string }) {
  const canchas = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const item of items) vistas.set(item.canchaId, item.canchaNombre);
    return [...vistas.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [items]);

  const [canchaFiltro, setCanchaFiltro] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(items[0]?.reservaId ?? null);

  const filtrados = canchaFiltro ? items.filter((i) => i.canchaId === canchaFiltro) : items;

  function elegirFiltro(id: string | null) {
    setCanchaFiltro(id);
    const nuevaLista = id ? items.filter((i) => i.canchaId === id) : items;
    setExpandidoId(nuevaLista[0]?.reservaId ?? null);
  }

  if (items.length === 0) {
    return (
      <div className="px-[22px] pt-[52px]">
        <EmptyState
          icono={CircleCheckBig}
          titulo="No hay comprobantes pendientes"
          descripcion="Estás al día."
          tono="positivo"
        />
      </div>
    );
  }

  const expandido = filtrados.find((i) => i.reservaId === expandidoId) ?? filtrados[0];
  const resto = filtrados.filter((i) => i.reservaId !== expandido?.reservaId);

  return (
    <div className="flex flex-col gap-5 px-[22px] pt-[52px] pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-bold">Comprobantes por validar</h1>
          <p className="text-[15px] text-muted-foreground">
            Ordenados por el que vence primero. Confirmá para apartar el horario; rechazá y se libera.
          </p>
        </div>

        {canchas.length > 1 && (
          <div className="flex items-center gap-[5px] rounded-full bg-card p-[5px]">
            <button
              type="button"
              onClick={() => elegirFiltro(null)}
              className={cn(
                "flex h-10 items-center rounded-full px-4 text-sm font-semibold",
                canchaFiltro === null ? "bg-primary text-primary-foreground" : "text-foreground"
              )}
            >
              Todas
            </button>
            {canchas.map((cancha) => (
              <button
                key={cancha.id}
                type="button"
                onClick={() => elegirFiltro(cancha.id)}
                className={cn(
                  "flex h-10 items-center rounded-full px-4 text-sm font-semibold",
                  canchaFiltro === cancha.id ? "bg-primary text-primary-foreground" : "text-foreground"
                )}
              >
                {cancha.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {expandido && <ItemExpandido key={expandido.reservaId} item={expandido} hoy={hoy} />}

      {resto.length > 0 && (
        <ul className="flex flex-col gap-3">
          {resto.map((item) => (
            <li key={item.reservaId}>
              <FilaColapsada item={item} hoy={hoy} onAbrir={() => setExpandidoId(item.reservaId)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
