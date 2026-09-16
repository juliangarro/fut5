"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/shared/Aviso";
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

// Ver plan-rediseno-dale-cancha.md Fase 7: preview antes de enviar, nunca
// perder la imagen ya elegida por un error de red (SPEC 7.3) — el File
// queda en estado local durante todo el ciclo de reintento/error. También
// se usa fuera de la hoja (ReservaEstado, estado `creada`), así que no
// depende de estar dentro de un HojaInferior.
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
        <button
          type="button"
          aria-busy={estado === "comprimiendo"}
          disabled={estado === "comprimiendo"}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-3.5 rounded-card bg-card px-4 py-3.5 text-left disabled:opacity-70"
        >
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-thumb bg-neutral-300">
            <Camera className="size-5 text-neutral-800" />
          </span>
          <span>
            <span className="block text-[16px] font-bold">
              {estado === "comprimiendo" ? "Preparando imagen…" : "Adjuntar comprobante"}
            </span>
            <span className="block text-[14px] text-neutral-700">Foto o captura del SINPE</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[27px] font-bold leading-tight">Revisá que se lea el monto</h2>
        <p className="mt-1 text-[15px] text-neutral-800">
          Así el dueño de la cancha lo valida de una.
        </p>
      </div>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Comprobante de pago SINPE"
          className="h-[300px] w-full rounded-card bg-card object-contain"
        />
      )}

      {estado === "error" && error ? (
        <Aviso tono="error">{error}</Aviso>
      ) : (
        <Aviso tono="exito">
          Si se corta la señal lo reintentamos solo. No pierdas la imagen: queda guardada acá.
        </Aviso>
      )}

      <div className="flex gap-2.5">
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
          variant="outline"
          size="icon-lg"
          onClick={() => inputRef.current?.click()}
          aria-label="Elegir otra imagen"
        >
          <RotateCcw />
        </Button>
        <Button size="lg" className="flex-1" disabled={estado === "subiendo"} onClick={enviar}>
          {estado === "subiendo" ? "Enviando…" : estado === "error" ? "Reintentar envío" : "Enviar comprobante"}
        </Button>
      </div>
    </div>
  );
}
