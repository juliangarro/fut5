import { Clock, Hourglass, CheckCircle2, XCircle, TimerOff, CircleSlash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EstadoReserva } from "@/lib/types/database";

// Único punto de verdad color+ícono+texto por estado de Reserva (ver
// plan-ui-ux-canchas-fut5-cr.md sección 4 y 1.2 — nunca reinterpretar el
// color de un estado en otra pantalla, y nunca mostrar un estado solo por
// color). Cualquier pantalla que muestre el estado de una Reserva usa este
// componente en vez de un badge ad-hoc.
const CONFIG: Record<
  EstadoReserva,
  { texto: string; icono: typeof Clock; clases: string }
> = {
  creada: {
    texto: "Esperando pago",
    icono: Clock,
    clases: "bg-neutral/10 text-neutral",
  },
  pendiente_validacion: {
    texto: "En revisión",
    icono: Hourglass,
    clases: "bg-warning/10 text-warning",
  },
  confirmada: {
    texto: "Confirmada",
    icono: CheckCircle2,
    clases: "bg-success/10 text-success",
  },
  rechazada: {
    texto: "Rechazada",
    icono: XCircle,
    clases: "bg-danger/10 text-danger",
  },
  expirada: {
    texto: "Expirada",
    icono: TimerOff,
    clases: "bg-neutral/10 text-neutral",
  },
  cancelada: {
    texto: "Cancelada",
    icono: CircleSlash2,
    clases: "bg-neutral/10 text-neutral",
  },
};

export function EstadoReservaBadge({
  estado,
  className,
}: {
  estado: EstadoReserva;
  className?: string;
}) {
  const { texto, icono: Icono, clases } = CONFIG[estado];
  return (
    <Badge className={cn("h-auto gap-1.5 px-2.5 py-1 text-sm font-medium", clases, className)}>
      <Icono className="size-3.5" />
      {texto}
    </Badge>
  );
}
