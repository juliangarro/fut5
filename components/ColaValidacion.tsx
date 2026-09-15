"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ItemCola = {
  reservaId: string;
  futboleroNombre: string;
  futboleroTelefono: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  monto: number;
  comprobanteUrlFirmada: string | null;
};

function FilaValidacion({ item }: { item: ItemCola }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null);
    const res = await fetch(`/api/reservas/${item.reservaId}/confirmar`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al confirmar.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function rechazar() {
    if (!motivo.trim()) {
      setError("El motivo es requerido.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/reservas/${item.reservaId}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al rechazar.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{item.futboleroNombre}</p>
          {item.futboleroTelefono && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.futboleroTelefono}</p>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {new Date(`${item.fecha}T00:00:00`).toLocaleDateString("es-CR")} ·{" "}
            {item.horaInicio.slice(0, 5)}–{item.horaFin.slice(0, 5)} · ₡
            {item.monto.toLocaleString("es-CR")}
          </p>
        </div>
      </div>

      {item.comprobanteUrlFirmada && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.comprobanteUrlFirmada}
          alt="Comprobante de pago"
          className="max-h-96 w-auto rounded border border-zinc-200 object-contain dark:border-zinc-800"
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!mostrarMotivo ? (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={confirmar}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setMostrarMotivo(true)}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo del rechazo (se lo notificamos al futbolero)"
            rows={2}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={rechazar}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirmar rechazo
            </button>
            <button
              type="button"
              onClick={() => setMostrarMotivo(false)}
              className="text-sm text-zinc-600 underline dark:text-zinc-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ColaValidacion({ items }: { items: ItemCola[] }) {
  if (items.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No hay reservas pendientes de validación.</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <FilaValidacion key={item.reservaId} item={item} />
      ))}
    </ul>
  );
}
