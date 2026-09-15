"use client";

import { useActionState } from "react";
import { crearSlot } from "@/app/admin/canchas/[canchaId]/slots/nueva/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CrearSlotForm({ canchaId }: { canchaId: string }) {
  const accionConCancha = crearSlot.bind(null, canchaId);
  const [state, formAction, pending] = useActionState(accionConCancha, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" type="date" name="fecha" required className="h-11" />
      </div>
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="hora_inicio">Hora inicio</Label>
          <Input id="hora_inicio" type="time" name="hora_inicio" required className="h-11" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="hora_fin">Hora fin</Label>
          <Input id="hora_fin" type="time" name="hora_fin" required className="h-11" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="precio">Precio (₡)</Label>
        <Input id="precio" type="number" name="precio" min="1" step="1" required className="h-11" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Crear horario"}
      </Button>
    </form>
  );
}
