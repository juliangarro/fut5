"use client";

import { useRef, useState } from "react";
import { comprimirImagen } from "@/lib/comprimirImagen";

const REINTENTOS_MAXIMOS = 3;

async function subirConReintentos(reservaId: string, file: File): Promise<{ ok: boolean; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  for (let intento = 1; intento <= REINTENTOS_MAXIMOS; intento++) {
    try {
      const res = await fetch(`/api/reservas/${reservaId}/comprobante`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (res.ok) return { ok: true };
      if (res.status < 500) return { ok: false, error: json.error ?? "Error al subir el comprobante." };
      // 5xx: reintentar (probable problema de conectividad, contexto real en Costa Rica — ver 10.9)
    } catch {
      // fetch falló (sin conexión) — reintentar
    }
    if (intento < REINTENTOS_MAXIMOS) {
      await new Promise((r) => setTimeout(r, 1000 * intento));
    }
  }
  return { ok: false, error: "No se pudo subir el comprobante. Revisá tu conexión e intentá de nuevo." };
}

export function ComprobanteUploader({ reservaId }: { reservaId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"idle" | "subiendo" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function manejarArchivo(file: File) {
    setEstado("subiendo");
    setError(null);
    const comprimido = await comprimirImagen(file);
    const resultado = await subirConReintentos(reservaId, comprimido);
    if (!resultado.ok) {
      setEstado("error");
      setError(resultado.error ?? "Error desconocido");
      return;
    }
    // El realtime de la página padre recoge el cambio de estado en `reservas`;
    // no hace falta recargar acá.
    setEstado("idle");
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) manejarArchivo(file);
        }}
      />
      <button
        type="button"
        disabled={estado === "subiendo"}
        onClick={() => inputRef.current?.click()}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {estado === "subiendo" ? "Subiendo comprobante…" : "Subir comprobante de pago"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
