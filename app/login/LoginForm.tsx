"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { entrar } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { BotonVolver } from "@/components/shared/BotonVolver";
import { Aviso } from "@/components/shared/Aviso";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");
  const modoCrear = searchParams.get("modo") === "crear";
  const [state, formAction, pending] = useActionState(entrar, undefined);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-[22px] pt-[26px] pb-8">
      <BotonVolver href="/" aria-label="Volver" />

      <div>
        <h1 className="text-[30px] font-bold tracking-[-0.02em]">
          {modoCrear ? "Creá tu cuenta" : "Entrá a tu cuenta"}
        </h1>
        <p className="mt-1.5 text-base text-neutral-800">
          Con tu correo. Si todavía no tenés cuenta, la creamos al entrar.
        </p>
      </div>

      {errorUrl === "link_invalido" && (
        <Aviso tono="atencion">Ese enlace ya no es válido o expiró.</Aviso>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-[14px]">
            Correo
          </Label>
          <Input id="email" type="email" name="email" required autoComplete="email" />
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-0.5 text-[15px] font-semibold">¿Cómo vas a usar la app?</legend>
          <RadioGroup name="rol" defaultValue="futbolero" className="gap-2.5">
            <TarjetaRol
              value="futbolero"
              titulo="Quiero jugar"
              descripcion="Buscar canchas y reservar"
            />
            <TarjetaRol
              value="admin_cancha"
              titulo="Tengo una cancha"
              descripcion="Publicar horarios y cobrar"
            />
          </RadioGroup>
          <p className="text-[14px] text-neutral-700">
            Si ya tenés cuenta, entrás con el tipo que elegiste la primera vez.
          </p>
        </fieldset>

        {state?.error && <Aviso tono="error">{state.error}</Aviso>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

function TarjetaRol({
  value,
  titulo,
  descripcion,
}: {
  value: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <Label
      className={cn(
        "flex min-h-[60px] cursor-pointer items-center gap-3 rounded-fila border border-border px-4 py-3",
        "has-data-checked:border-2 has-data-checked:border-brand has-data-checked:bg-terracota-100 has-data-checked:py-[11px]"
      )}
    >
      <RadioGroupItem
        value={value}
        className="size-[22px] shrink-0 border-neutral-600 data-checked:border-brand data-checked:bg-brand"
      />
      <span>
        <span className="block text-[16px] font-bold text-foreground">{titulo}</span>
        <span className="block text-[14px] text-neutral-700">{descripcion}</span>
      </span>
    </Label>
  );
}
