"use client";

import { useActionState } from "react";
import { crearCancha } from "./actions";

export default function NuevaCanchaPage() {
  const [state, formAction, pending] = useActionState(crearCancha, undefined);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nueva cancha</h1>
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
          Número SINPE Móvil (para recibir pagos)
          <input
            type="tel"
            name="numero_sinpe"
            required
            placeholder="8888-8888"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <textarea
            name="descripcion"
            rows={3}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Política de cancelación
          <textarea
            name="politica_cancelacion"
            rows={2}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Guardando…" : "Crear cancha"}
        </button>
      </form>
    </div>
  );
}
