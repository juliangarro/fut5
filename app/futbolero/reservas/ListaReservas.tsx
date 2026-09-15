"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarSearch } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EstadoReservaBadge } from "@/components/shared/EstadoReservaBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import type { EstadoReserva } from "@/lib/types/database";

export type ReservaConDatos = {
  id: string;
  estado: EstadoReserva;
  canchaNombre: string;
  fecha: string;
  horaInicio: string;
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

function FilaReserva({ reserva }: { reserva: ReservaConDatos }) {
  return (
    <li>
      <Link
        href={`/futbolero/reservas/${reserva.id}`}
        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40"
      >
        <div>
          <p className="font-medium">{reserva.canchaNombre}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(`${reserva.fecha}T00:00:00`).toLocaleDateString("es-CR")} ·{" "}
            {reserva.horaInicio.slice(0, 5)}
          </p>
        </div>
        <EstadoReservaBadge estado={reserva.estado} />
      </Link>
    </li>
  );
}

export function ListaReservas({ reservas }: { reservas: ReservaConDatos[] }) {
  const [tab, setTab] = useState<"activas" | "pasadas">("activas");
  const activas = reservas.filter((r) => r.activa);
  const pasadas = reservas.filter((r) => !r.activa);

  if (reservas.length === 0) return <ListaVacia activas />;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "activas" | "pasadas")}>
      <TabsList>
        <TabsTrigger value="activas">Activas</TabsTrigger>
        <TabsTrigger value="pasadas">Pasadas</TabsTrigger>
      </TabsList>
      <TabsContent value="activas" className="pt-3">
        {activas.length === 0 ? (
          <ListaVacia activas />
        ) : (
          <ul className="flex flex-col gap-3">
            {activas.map((r) => (
              <FilaReserva key={r.id} reserva={r} />
            ))}
          </ul>
        )}
      </TabsContent>
      <TabsContent value="pasadas" className="pt-3">
        {pasadas.length === 0 ? (
          <ListaVacia activas={false} />
        ) : (
          <ul className="flex flex-col gap-3">
            {pasadas.map((r) => (
              <FilaReserva key={r.id} reserva={r} />
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
