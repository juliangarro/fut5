"use client";

import { useActionState } from "react";
import { actualizarCancha } from "./actions";
import { AMENIDADES_DISPONIBLES, type AmenidadKey } from "@/lib/amenidades";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function InfoCanchaForm({
  canchaId,
  cancha,
}: {
  canchaId: string;
  cancha: {
    nombre: string;
    numero_sinpe: string;
    descripcion: string | null;
    politica_cancelacion: string | null;
    amenidades: AmenidadKey[];
  };
}) {
  const accion = actualizarCancha.bind(null, canchaId);
  const [state, formAction, pending] = useActionState(accion, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required defaultValue={cancha.nombre} className="h-11" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="numero_sinpe">Número SINPE Móvil</Label>
        <Input
          id="numero_sinpe"
          name="numero_sinpe"
          required
          defaultValue={cancha.numero_sinpe}
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" name="descripcion" rows={3} defaultValue={cancha.descripcion ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="politica_cancelacion">Política de cancelación</Label>
        <Textarea
          id="politica_cancelacion"
          name="politica_cancelacion"
          rows={2}
          defaultValue={cancha.politica_cancelacion ?? ""}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Amenidades</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AMENIDADES_DISPONIBLES.map((a) => (
            <Label
              key={a.key}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5"
            >
              <Checkbox name="amenidades" value={a.key} defaultChecked={cancha.amenidades.includes(a.key)} />
              {a.label}
            </Label>
          ))}
        </div>
      </fieldset>

      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
      {state && "exito" in state && <p className="text-sm text-success">Cambios guardados.</p>}

      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
