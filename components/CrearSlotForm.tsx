"use client";

import { useActionState } from "react";
import { crearSlot } from "@/app/admin/canchas/[canchaId]/slots/nueva/actions";

export function CrearSlotForm({ canchaId }: { canchaId: string }) {
  const accionConCancha = crearSlot.bind(null, canchaId);
  const [state, formAction, pending] = useActionState(accionConCancha, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Fecha
        <input
          type="date"
          name="fecha"
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Hora inicio
          <input
            type="time"
            name="hora_inicio"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Hora fin
          <input
            type="time"
            name="hora_fin"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Precio (₡)
        <input
          type="number"
          name="precio"
          min="1"
          step="1"
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Guardando…" : "Crear horario"}
      </button>
    </form>
  );
}
