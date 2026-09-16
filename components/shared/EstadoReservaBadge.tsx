import { Clock, Hourglass, CircleCheck, CircleX, TimerOff, CircleSlash2, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EstadoReserva } from "@/lib/types/database";

// Único punto de verdad color+ícono+texto por estado de Reserva (ver
// plan-rediseno-dale-cancha.md sección 4.2 — nunca reinterpretar el color
// de un estado en otra pantalla, y nunca mostrar un estado solo por color).
// Cualquier pantalla que muestre el estado de una Reserva usa este
// componente (badge) o TONO_ESTADO_RESERVA (cabecera) en vez de algo ad-hoc.
const CONFIG: Record<
  EstadoReserva,
  {
    texto: string;
    icono: LucideIcon;
    badge: string;
    cabeceraFondo: string;
    cabeceraCirculo: string;
    cabeceraTexto: string;
  }
> = {
  creada: {
    texto: "Esperando pago",
    icono: Clock,
    badge: "bg-neutral-200 text-neutral-800",
    cabeceraFondo: "bg-neutral-200",
    cabeceraCirculo: "bg-neutral-800",
    cabeceraTexto: "text-neutral-900",
  },
  pendiente_validacion: {
    texto: "En revisión",
    icono: Hourglass,
    badge: "bg-terracota-200 text-terracota-900",
    cabeceraFondo: "bg-terracota-100",
    cabeceraCirculo: "bg-brand",
    cabeceraTexto: "text-terracota-900",
  },
  confirmada: {
    texto: "Confirmada",
    icono: CircleCheck,
    badge: "bg-sage-200 text-sage-900",
    cabeceraFondo: "bg-sage-100",
    cabeceraCirculo: "bg-sage-700",
    cabeceraTexto: "text-sage-900",
  },
  rechazada: {
    texto: "Rechazada",
    icono: CircleX,
    badge: "bg-terracota-200 text-terracota-900",
    cabeceraFondo: "bg-terracota-100",
    cabeceraCirculo: "bg-terracota-800",
    cabeceraTexto: "text-terracota-900",
  },
  expirada: {
    texto: "Expirada",
    icono: TimerOff,
    badge: "bg-neutral-200 text-neutral-800",
    cabeceraFondo: "bg-neutral-200",
    cabeceraCirculo: "bg-neutral-700",
    cabeceraTexto: "text-neutral-900",
  },
  cancelada: {
    texto: "Cancelada",
    icono: CircleSlash2,
    badge: "bg-neutral-200 text-neutral-800",
    cabeceraFondo: "bg-neutral-200",
    cabeceraCirculo: "bg-neutral-700",
    cabeceraTexto: "text-neutral-900",
  },
};

// Reusado fuera de este componente (ej. el toast de cambio de estado en
// ReservaEstado.tsx) para nunca mostrarle al usuario el valor crudo del
// enum de la base de datos.
export const ETIQUETA_ESTADO_RESERVA: Record<EstadoReserva, string> = Object.fromEntries(
  Object.entries(CONFIG).map(([estado, { texto }]) => [estado, texto])
) as Record<EstadoReserva, string>;

export const TONO_ESTADO_RESERVA: Record<
  EstadoReserva,
  Pick<(typeof CONFIG)[EstadoReserva], "icono" | "cabeceraFondo" | "cabeceraCirculo" | "cabeceraTexto">
> = CONFIG;

export function EstadoReservaBadge({
  estado,
  className,
}: {
  estado: EstadoReserva;
  className?: string;
}) {
  const { texto, icono: Icono, badge } = CONFIG[estado];
  return (
    <Badge className={cn("gap-1.5 [&>svg]:size-[15px] text-[14px] font-semibold", badge, className)}>
      <Icono />
      {texto}
    </Badge>
  );
}
