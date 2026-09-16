"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarSearch } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EstadoReservaBadge } from "@/components/shared/EstadoReservaBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatearDiaCorto, formatearRangoHoras } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { EstadoReserva } from "@/lib/types/database";

export type ReservaConDatos = {
  id: string;
  estado: EstadoReserva;
  canchaNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  activa: boolean;
};

function ListaVacia({ activas }: { activas: boolean }) {
  return (
    <EmptyState
      icono={CalendarSearch}
      titulo={activas ? "No tenés reservas activas" : "Todavía no tenés reservas pasadas"}
      descripcion={activas ? "Buscá una cancha y elegí un horario." : undefined}
      accion={activas ? { texto: "Buscar una cancha", href: "/futbolero/canchas" } : undefined}
    />
  );
}

// Copy "qué sigue" por fila (Fase 9): solo para los 2 estados donde el
// futbolero tiene algo pendiente de su lado o del lado de la cancha.
function queSigueFila(estado: EstadoReserva): string | null {
  if (estado === "pendiente_validacion") return "Te avisamos cuando la cancha confirme el pago.";
  if (estado === "creada") return "Falta adjuntar el comprobante.";
  return null;
}

function FilaReserva({ reserva, hoy }: { reserva: ReservaConDatos; hoy: string }) {
  const queSigue = queSigueFila(reserva.estado);

  return (
    <li>
      <Link
        href={`/futbolero/reservas/${reserva.id}`}
        className={cn(
          "flex items-center justify-between gap-3 rounded-card bg-card px-[18px] py-4",
          reserva.estado === "pendiente_validacion" && "shadow-sm"
        )}
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-[17px] font-bold">{reserva.canchaNombre}</p>
          <p className="text-[15px] text-muted-foreground">
            {formatearDiaCorto(reserva.fecha, hoy)} · {formatearRangoHoras(reserva.horaInicio, reserva.horaFin)}
          </p>
          {queSigue && <p className="text-sm text-muted-foreground">{queSigue}</p>}
        </div>
        <EstadoReservaBadge estado={reserva.estado} />
      </Link>
    </li>
  );
}

export function ListaReservas({ reservas, hoy }: { reservas: ReservaConDatos[]; hoy: string }) {
  const [tab, setTab] = useState<"activas" | "pasadas">("activas");
  const activas = reservas.filter((r) => r.activa);
  const pasadas = reservas.filter((r) => !r.activa);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="px-[22px] pt-[52px] text-[28px] font-bold">Mis reservas</h1>

      {reservas.length === 0 ? (
        <div className="px-[22px]">
          <ListaVacia activas />
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-[22px]">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "activas" | "pasadas")}>
            <TabsList className="w-full">
              <TabsTrigger value="activas" className="flex-1">
                Activas
              </TabsTrigger>
              <TabsTrigger value="pasadas" className="flex-1">
                Pasadas
              </TabsTrigger>
            </TabsList>
            <TabsContent value="activas" className="pt-4">
              {activas.length === 0 ? (
                <ListaVacia activas />
              ) : (
                <ul className="flex flex-col gap-3">
                  {activas.map((r) => (
                    <FilaReserva key={r.id} reserva={r} hoy={hoy} />
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="pasadas" className="pt-4">
              {pasadas.length === 0 ? (
                <ListaVacia activas={false} />
              ) : (
                <ul className="flex flex-col gap-3">
                  {pasadas.map((r) => (
                    <FilaReserva key={r.id} reserva={r} hoy={hoy} />
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
