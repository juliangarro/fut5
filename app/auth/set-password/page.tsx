"use client";

import { useActionState } from "react";
import { establecerPassword } from "./actions";

export default function SetPasswordPage() {
  const [state, formAction, pending] = useActionState(establecerPassword, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Creá tu contraseña</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Para terminar de activar tu cuenta, elegí una contraseña.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirmar contraseña
          <input
            type="password"
            name="confirmacion"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Guardando…" : "Guardar y continuar"}
        </button>
      </form>
    </div>
  );
}
