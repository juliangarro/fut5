"use client";

import { useActionState } from "react";
import { crearCancha } from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function NuevaCanchaPage() {
  const [state, formAction, pending] = useActionState(crearCancha, undefined);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nueva cancha</h1>
      <Card className="px-4">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" type="text" name="nombre" required className="h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numero_sinpe">Número SINPE Móvil (para recibir pagos)</Label>
            <Input
              id="numero_sinpe"
              type="tel"
              name="numero_sinpe"
              required
              placeholder="8888-8888"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" name="descripcion" rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="politica_cancelacion">Política de cancelación</Label>
            <Textarea id="politica_cancelacion" name="politica_cancelacion" rows={2} />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" size="lg" className="h-11" disabled={pending}>
            {pending ? "Guardando…" : "Crear cancha"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
