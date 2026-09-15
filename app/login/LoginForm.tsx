"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { entrar } from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");
  const [state, formAction, pending] = useActionState(entrar, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribí tu email y elegí qué tipo de cuenta usar. Si ya existe, entrás directo.
        </p>
      </div>

      {errorUrl === "link_invalido" && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
          Ese enlace ya no es válido o expiró.
        </p>
      )}

      <Card className="px-4">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" name="email" required autoComplete="email" className="h-11" />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Tipo de cuenta</legend>
            <RadioGroup name="rol" defaultValue="futbolero">
              <Label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 has-data-checked:border-primary has-data-checked:bg-primary/5">
                <RadioGroupItem value="futbolero" />
                <span>
                  <span className="font-medium">Futbolero</span>
                  <span className="block text-xs text-muted-foreground">
                    Busco y reservo canchas
                  </span>
                </span>
              </Label>
              <Label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 has-data-checked:border-primary has-data-checked:bg-primary/5">
                <RadioGroupItem value="admin_cancha" />
                <span>
                  <span className="font-medium">AdminCancha</span>
                  <span className="block text-xs text-muted-foreground">
                    Administro una o más canchas
                  </span>
                </span>
              </Label>
            </RadioGroup>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            Si tu email ya tiene una cuenta, entrás con el tipo que ya tenías asignado, aunque
            elijas otro acá.
          </p>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <Button type="submit" size="lg" className="h-11" disabled={pending}>
            {pending ? "Entrando…" : "Continuar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
