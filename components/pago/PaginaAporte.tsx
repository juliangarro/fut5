"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/shared/Aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { comprimirImagen } from "@/lib/comprimirImagen";
import { formatearColones, formatearFechaLarga, formatearRangoHoras, iniciales } from "@/lib/formato";

type Resumen = {
  reserva: { id: string; estado: string; monto: number };
  cancha: { nombre: string; numeroSinpe: string } | null;
  slot: { fecha: string; horaInicio: string; horaFin: string };
  organizadorNombre: string;
  cantidadAportes: number;
  montoPorAporte: number;
  aportesConfirmados: number;
  aportes: { id: string; nombre: string; estado: string }[];
};

const REINTENTOS_MAXIMOS = 3;

async function subirComprobante(
  token: string,
  aporteId: string,
  file: File
): Promise<{ ok: boolean; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  for (let intento = 1; intento <= REINTENTOS_MAXIMOS; intento++) {
    try {
      const res = await fetch(`/api/pago/${token}/aportes/${aporteId}/comprobante`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return { ok: true };
      const json = await res.json().catch(() => null);
      if (res.status < 500) return { ok: false, error: json?.error ?? "Error al subir el comprobante." };
    } catch {
      // sin conexión / timeout — reintentar
    }
    if (intento < REINTENTOS_MAXIMOS) await new Promise((r) => setTimeout(r, 1000 * intento));
  }
  return { ok: false, error: "No se pudo subir el comprobante. Revisá tu conexión e intentá de nuevo." };
}

function Cargando() {
  return <p className="px-5 pt-16 text-center text-[15px] text-muted-foreground">Cargando…</p>;
}

function LinkNoEncontrado() {
  return (
    <div className="px-5 pt-16">
      <Aviso tono="error">
        Este link ya no está disponible. Pedile al organizador que te comparta uno nuevo.
      </Aviso>
    </div>
  );
}

function FormularioNombre({
  montoPorAporte,
  onListo,
}: {
  montoPorAporte: number;
  onListo: (aporteId: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Escribí tu nombre.");
      return;
    }
    setCargando(true);
    setError(null);
    const token = window.location.pathname.split("/").pop() ?? "";
    const res = await fetch(`/api/pago/${token}/aportes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim() || undefined }),
    });
    const json = await res.json();
    setCargando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo registrar tu pago.");
      return;
    }
    onListo(json.aporteId);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre-aporte">Tu nombre</Label>
        <Input
          id="nombre-aporte"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={60}
          placeholder="Ej. Fabián Rojas"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="telefono-aporte">Tu teléfono (opcional)</Label>
        <Input
          id="telefono-aporte"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Para avisarte si algo falla"
        />
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Button type="submit" size="lg" disabled={cargando}>
        {cargando ? "Un momento…" : `Voy a pagar ${formatearColones(montoPorAporte)}`}
      </Button>
    </form>
  );
}

function UploaderAporte({ token, aporteId }: { token: string; aporteId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<"idle" | "listo" | "subiendo" | "error" | "enviado">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function elegirArchivo(file: File) {
    const comprimido = await comprimirImagen(file);
    setArchivo(comprimido);
    setPreviewUrl(URL.createObjectURL(comprimido));
    setEstado("listo");
  }

  async function enviar() {
    if (!archivo) return;
    setEstado("subiendo");
    setError(null);
    const resultado = await subirComprobante(token, aporteId, archivo);
    if (!resultado.ok) {
      setEstado("error");
      setError(resultado.error ?? "Error desconocido");
      return;
    }
    setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <Aviso tono="exito">
        Comprobante enviado. El organizador lo ve al instante y la cancha lo confirma pronto.
      </Aviso>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Comprobante de pago SINPE" className="h-[220px] w-full rounded-card bg-card object-contain" />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-3.5 rounded-card border-1.5 border-dashed border-neutral-500 bg-card px-4 py-4 text-left"
        >
          <span className="text-[14px] text-muted-foreground">
            📎 Arrastrá la captura del SINPE o tocá para subirla
          </span>
        </button>
      )}

      {estado === "error" && error && <Aviso tono="error">{error}</Aviso>}

      <div className="flex gap-2">
        {previewUrl && (
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Cambiar
          </Button>
        )}
        <Button type="button" className="flex-1" size="lg" disabled={!archivo || estado === "subiendo"} onClick={enviar}>
          {estado === "subiendo" ? "Enviando…" : "Ya pagué, adjuntar comprobante"}
        </Button>
      </div>
    </div>
  );
}

export function PaginaAporte({ token }: { token: string }) {
  const [resumen, setResumen] = useState<Resumen | null | "error">(null);
  const [aporteId, setAporteId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pago/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setResumen)
      .catch(() => setResumen("error"));
  }, [token]);

  if (resumen === null) return <Cargando />;
  if (resumen === "error") return <LinkNoEncontrado />;
  if (resumen.reserva.estado !== "creada") {
    return (
      <div className="px-5 pt-16">
        <Aviso tono="info">Esta reserva ya se resolvió — no hace falta pagar por acá.</Aviso>
      </div>
    );
  }

  const otros = resumen.aportes.filter((a) => a.estado === "confirmado").slice(0, 3);

  return (
    <div className="flex flex-col gap-4 px-5 pt-10 pb-10">
      <div className="flex flex-col gap-1 rounded-card bg-terracota-900 px-[18px] py-[18px] text-terracota-100">
        <span className="text-[12px] opacity-80">{resumen.organizadorNombre} te invitó a jugar</span>
        <span className="text-[18px] font-extrabold">{resumen.cancha?.nombre ?? "Cancha"}</span>
        <span className="text-[13px] opacity-85">
          {formatearFechaLarga(resumen.slot.fecha)} · {formatearRangoHoras(resumen.slot.horaInicio, resumen.slot.horaFin)}
        </span>
        {otros.length > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex">
              {otros.map((a, i) => (
                <span
                  key={a.id}
                  className="-ml-1.5 flex size-5 items-center justify-center rounded-full border-2 border-terracota-900 bg-sage-500 text-[8.5px] font-bold text-white first:ml-0"
                  style={{ zIndex: otros.length - i }}
                >
                  {iniciales(a.nombre)}
                </span>
              ))}
            </div>
            <span className="text-[11.5px] opacity-90">
              {resumen.aportesConfirmados} de {resumen.cantidadAportes} ya pagaron su parte
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 rounded-card bg-terracota-100 px-[18px] py-5 text-center">
        <span className="text-[12px] font-semibold text-terracota-800">Te toca pagar</span>
        <span className="text-[34px] font-extrabold text-terracota-900">
          {formatearColones(resumen.montoPorAporte)}
        </span>
        {resumen.cancha && (
          <div className="mt-1.5 flex w-full items-center justify-between rounded-[14px] bg-white px-3.5 py-2.5">
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wide text-terracota-800 opacity-75">
                SINPE Móvil
              </div>
              <div className="text-[15px] font-bold text-terracota-900">{resumen.cancha.numeroSinpe}</div>
            </div>
            <div className="text-right text-[10px] font-bold uppercase tracking-wide text-terracota-800 opacity-75">
              a nombre de
              <br />
              {resumen.cancha.nombre}
            </div>
          </div>
        )}
      </div>

      {!aporteId ? (
        <FormularioNombre montoPorAporte={resumen.montoPorAporte} onListo={setAporteId} />
      ) : (
        <UploaderAporte token={token} aporteId={aporteId} />
      )}

      <Aviso tono="info">
        No necesitás cuenta ni instalar nada. Tu comprobante queda ligado a esta reserva y el
        organizador lo ve al instante.
      </Aviso>
    </div>
  );
}
