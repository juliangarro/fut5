"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { entrar } from "./actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");
  const [state, formAction, pending] = useActionState(entrar, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Escribí tu email y elegí qué tipo de cuenta usar. Si ya existe, entrás directo.
        </p>
      </div>
      {errorUrl === "link_invalido" && (
        <p className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Ese enlace ya no es válido o expiró.
        </p>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">Tipo de cuenta</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="rol" value="futbolero" defaultChecked />
            Futbolero — busco y reservo canchas
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="rol" value="admin_cancha" />
            AdminCancha — administro una o más canchas
          </label>
        </fieldset>
        <p className="text-xs text-zinc-500">
          Si tu email ya tiene una cuenta, entrás con el tipo que ya tenías asignado, aunque
          elijas otro acá.
        </p>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Entrando…" : "Continuar"}
        </button>
      </form>
    </div>
  );
}
