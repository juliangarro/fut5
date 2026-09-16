"use client";

import { useActionState } from "react";
import { crearCancha } from "./actions";
import { BotonVolver } from "@/components/shared/BotonVolver";
import { Aviso } from "@/components/shared/Aviso";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function NuevaCanchaPage() {
  const [state, formAction, pending] = useActionState(crearCancha, undefined);

  return (
    <div className="flex max-w-lg flex-col gap-5 px-[22px] pt-[52px] pb-8">
      <div className="flex items-center gap-3">
        <BotonVolver href="/admin" aria-label="Volver al panel" />
        <h1 className="text-[28px] font-bold">Nueva cancha</h1>
      </div>
      <Card className="gap-4 px-5 py-5">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" type="text" name="nombre" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numero_sinpe">Número SINPE Móvil (para recibir pagos)</Label>
            <Input id="numero_sinpe" type="tel" name="numero_sinpe" required placeholder="8888-8888" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" name="descripcion" rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="politica_cancelacion">Política de cancelación</Label>
            <Textarea id="politica_cancelacion" name="politica_cancelacion" rows={2} />
          </div>
          {state?.error && <Aviso tono="error">{state.error}</Aviso>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Guardando…" : "Crear cancha"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
