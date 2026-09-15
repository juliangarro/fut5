"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registrar } from "./actions";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registrar, undefined);

  if (state && "exitoRequiereConfirmacion" in state) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Revisá tu email</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Te enviamos un enlace de confirmación. Una vez confirmado, iniciá sesión.
        </p>
        <Link href="/login" className="font-medium underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input
            type="text"
            name="nombre"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
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
        {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
