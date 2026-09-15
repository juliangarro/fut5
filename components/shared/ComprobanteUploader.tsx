"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { comprimirImagen } from "@/lib/comprimirImagen";

const REINTENTOS_MAXIMOS = 3;

async function subirConReintentos(
  reservaId: string,
  file: File
): Promise<{ ok: boolean; error?: string }> {
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
      // 5xx: reintentar (probable problema de conectividad, contexto real en Costa Rica — ver 7.5/10.9)
    } catch {
      // fetch falló (sin conexión) — reintentar
    }
    if (intento < REINTENTOS_MAXIMOS) {
      await new Promise((r) => setTimeout(r, 1000 * intento));
    }
  }
  return { ok: false, error: "No se pudo subir el comprobante. Revisá tu conexión e intentá de nuevo." };
}

// Ver plan-ui-ux-canchas-fut5-cr.md 5.5: preview antes de enviar, nunca
// perder la imagen ya elegida por un error de red (7.3) — el File queda en
// estado local durante todo el ciclo de reintento/error.
export function ComprobanteUploader({
  reservaId,
  onExito,
}: {
  reservaId: string;
  onExito?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<"idle" | "comprimiendo" | "listo" | "subiendo" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function elegirArchivo(file: File) {
    setEstado("comprimiendo");
    setError(null);
    const comprimido = await comprimirImagen(file);
    setArchivo(comprimido);
    setPreviewUrl(URL.createObjectURL(comprimido));
    setEstado("listo");
  }

  async function enviar() {
    if (!archivo) return;
    setEstado("subiendo");
    setError(null);
    const resultado = await subirConReintentos(reservaId, archivo);
    if (!resultado.ok) {
      setEstado("error");
      setError(resultado.error ?? "Error desconocido");
      return;
    }
    onExito?.();
  }

  if (estado === "idle" || estado === "comprimiendo") {
    return (
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) elegirArchivo(file);
          }}
        />
        <Button
          size="lg"
          className="h-12"
          disabled={estado === "comprimiendo"}
          onClick={() => inputRef.current?.click()}
        >
          <Camera />
          {estado === "comprimiendo" ? "Preparando imagen…" : "Elegir comprobante"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Comprobante de pago SINPE"
          className="max-h-80 w-full rounded-xl border border-border object-contain"
        />
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => inputRef.current?.click()}
          aria-label="Elegir otra imagen"
        >
          <RotateCcw />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) elegirArchivo(file);
          }}
        />
        <Button size="lg" className="h-12 flex-1" disabled={estado === "subiendo"} onClick={enviar}>
          {estado === "subiendo" ? "Enviando…" : estado === "error" ? "Reintentar envío" : "Enviar comprobante"}
        </Button>
      </div>
    </div>
  );
}
