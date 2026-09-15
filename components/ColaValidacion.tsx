"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheckBig } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

export type ItemCola = {
  reservaId: string;
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

function ContadorExpiracion({ expiraAt }: { expiraAt: string | null }) {
  const [minutos, setMinutos] = useState(() => minutosRestantes(expiraAt));

  useEffect(() => {
    const id = setInterval(() => setMinutos(minutosRestantes(expiraAt)), 15000);
    return () => clearInterval(id);
  }, [expiraAt]);

  if (minutos === null) return null;
  const vencido = minutos <= 0;
  const porVencer = minutos <= 10;

  return (
    <span
      className={cn(
        "text-xs font-medium",
        vencido ? "text-danger" : porVencer ? "text-warning" : "text-muted-foreground"
      )}
    >
      {vencido ? "Venciendo…" : `Vence en ${minutos} min`}
    </span>
  );
}

function FilaValidacion({ item }: { item: ItemCola }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogoRechazo, setDialogoRechazo] = useState(false);
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
    <Card className="gap-3 px-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{item.futboleroNombre}</p>
            <Badge variant="outline">{item.canchaNombre}</Badge>
          </div>
          {item.futboleroTelefono && (
            <p className="text-sm text-muted-foreground">{item.futboleroTelefono}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {new Date(`${item.fecha}T00:00:00`).toLocaleDateString("es-CR")} ·{" "}
            {item.horaInicio.slice(0, 5)}–{item.horaFin.slice(0, 5)} · ₡
            {item.monto.toLocaleString("es-CR")}
          </p>
        </div>
        <ContadorExpiracion expiraAt={item.expiraAt} />
      </div>

      {item.comprobanteUrlFirmada && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.comprobanteUrlFirmada}
          alt="Comprobante de pago SINPE"
          className="max-h-96 w-auto rounded-xl border border-border object-contain"
        />
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={confirmar}
          className="h-11 flex-1 bg-success text-success-foreground hover:bg-success/90"
        >
          Confirmar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setDialogoRechazo(true)}
          className="h-11 flex-1 border-danger/30 text-danger hover:bg-danger/10"
        >
          Rechazar
        </Button>
      </div>

      <ConfirmDialog
        open={dialogoRechazo}
        onOpenChange={setDialogoRechazo}
        titulo="Rechazar comprobante"
        descripcion="El futbolero va a ver este motivo y el horario se libera."
        textoConfirmar="Confirmar rechazo"
        onConfirmar={rechazar}
      >
        <div className="flex flex-col gap-1.5">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo del rechazo"
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </ConfirmDialog>
    </Card>
  );
}

export function ColaValidacion({ items }: { items: ItemCola[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icono={CircleCheckBig}
        titulo="No hay comprobantes pendientes"
        descripcion="Estás al día."
        tono="positivo"
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.reservaId}>
          <FilaValidacion item={item} />
        </li>
      ))}
    </ul>
  );
}
