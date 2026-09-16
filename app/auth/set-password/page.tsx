"use client";

import { useActionState } from "react";
import { establecerPassword } from "./actions";
import { Marca } from "@/components/shared/Marca";
import { Aviso } from "@/components/shared/Aviso";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SetPasswordPage() {
  const [state, formAction, pending] = useActionState(establecerPassword, undefined);

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <Marca />
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold">Creá tu contraseña</h1>
        <p className="text-[15px] text-neutral-800">
          Para terminar de activar tu cuenta, elegí una contraseña.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" name="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmacion">Confirmar contraseña</Label>
          <Input
            id="confirmacion"
            type="password"
            name="confirmacion"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {state?.error && <Aviso tono="error">{state.error}</Aviso>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando…" : "Guardar y continuar"}
        </Button>
      </form>
    </div>
  );
}
