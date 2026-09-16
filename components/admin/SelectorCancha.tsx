"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Un AdminCancha puede administrar más de una Cancha (SPEC.md 3.2.1) — este
// selector aparece en toda pantalla de administración de UNA cancha
// específica (info, horarios) para poder saltar a otra sin volver al
// dashboard. Se oculta solo si el admin tiene una única cancha.
export function SelectorCancha({
  canchas,
  canchaActualId,
  sufijoRuta,
}: {
  canchas: { id: string; nombre: string }[];
  canchaActualId: string;
  /** ej. "info" o "slots/nueva" — arma /admin/canchas/{id}/{sufijoRuta}. No es
   * un callback: un Server Component no puede pasar funciones a un Client
   * Component, solo datos serializables. */
  sufijoRuta: string;
}) {
  const router = useRouter();

  if (canchas.length <= 1) return null;

  return (
    <Select
      value={canchaActualId}
      onValueChange={(id) => router.push(`/admin/canchas/${id}/${sufijoRuta}`)}
    >
      <SelectTrigger className="w-full sm:w-72">
        <SelectValue>
          {(id: string) => canchas.find((c) => c.id === id)?.nombre ?? id}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {canchas.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
