"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Aviso } from "@/components/shared/Aviso";
import { formatearColones } from "@/lib/formato";
import type { EstadoAporte } from "@/lib/types/database";

type Aporte = { id: string; nombre: string; estado: EstadoAporte };

const ETIQUETA_ESTADO_APORTE: Record<EstadoAporte, string> = {
  pendiente: "Pendiente",
  comprobante_subido: "En revisión",
  confirmado: "Pagó",
  rechazado: "Rechazado, va a reintentar",
};

function claseChip(estado: EstadoAporte): string {
  if (estado === "confirmado") return "bg-sage-100 text-sage-900";
  if (estado === "comprobante_subido") return "bg-terracota-300 text-terracota-900";
  return "bg-card text-muted-foreground border border-terracota-300";
}

// Formulario para arrancar el cobro grupal — solo aplica mientras la reserva
// está en 'creada' y todavía no se generó un link.
function FormularioIniciar({ reservaId, montoTotal }: { reservaId: string; montoTotal: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState("10");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cantidadNum = Number(cantidad);
  const montoPorPersona = cantidadNum > 0 ? Math.ceil(montoTotal / cantidadNum) : 0;

  async function iniciar() {
    setError(null);
    if (!Number.isInteger(cantidadNum) || cantidadNum < 2 || cantidadNum > 30) {
      setError("Ingresá un número entre 2 y 30.");
      return;
    }
    setCargando(true);
    const res = await fetch(`/api/reservas/${reservaId}/link-cobro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidadAportes: cantidadNum }),
    });
    const json = await res.json();
    setCargando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo generar el link.");
      return;
    }
    toast.success("Link de cobro listo");
    router.refresh();
  }

  if (!abierto) {
    return (
      <Card className="gap-3 px-4 py-4">
        <p className="text-[15px]">
          ¿Vas a jugar con amigos? Generá un link para que cada uno pague su parte por SINPE,
          sin que tengas que cobrarles vos.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={() => setAbierto(true)}>
          Cobrar entre amigos
        </Button>
      </Card>
    );
  }

  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cantidad-aportes" className="text-[14px] font-semibold">
          ¿Entre cuántos van a pagar?
        </label>
        <Input
          id="cantidad-aportes"
          type="number"
          inputMode="numeric"
          min={2}
          max={30}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <p className="text-[13px] text-muted-foreground">
          {formatearColones(montoPorPersona)} por persona ({formatearColones(montoTotal)} en total).
        </p>
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)} disabled={cargando}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1" onClick={iniciar} disabled={cargando}>
          {cargando ? "Generando…" : "Generar link"}
        </Button>
      </div>
    </Card>
  );
}

function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Sin permiso de portapapeles (ej. contexto no seguro) — el link
      // igual queda visible en pantalla para copiar a mano.
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  const mensajeWhatsapp = encodeURIComponent(`¡Dale que jugamos! Pagá tu parte acá: ${url}`);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-[14px] border border-neutral-300 bg-background px-3 py-2.5">
        <span className="flex-1 truncate text-[12.5px] text-muted-foreground">{url}</span>
        <button
          type="button"
          onClick={copiar}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${
            copiado ? "bg-sage-100 text-sage-900" : "bg-terracota-300 text-terracota-900"
          }`}
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <a
        href={`https://wa.me/?text=${mensajeWhatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground"
      >
        Enviar por WhatsApp
      </a>
    </div>
  );
}

export function CobroGrupal({
  reservaId,
  montoTotal,
  modoCobro,
  tokenCobro,
  cantidadAportes,
  aportesIniciales,
  origenSitio,
}: {
  reservaId: string;
  montoTotal: number;
  modoCobro: "individual" | "grupal";
  tokenCobro: string | null;
  cantidadAportes: number | null;
  aportesIniciales: Aporte[];
  origenSitio: string;
}) {
  const [aportes, setAportes] = useState(aportesIniciales);

  useEffect(() => {
    if (modoCobro !== "grupal") return;
    const supabase = createClient();
    const canal = supabase
      .channel(`aportes-${reservaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aportes", filter: `reserva_id=eq.${reservaId}` },
        (payload) => {
          setAportes((actuales) => {
            if (payload.eventType === "INSERT") {
              const nuevo = payload.new as Aporte;
              return [...actuales, nuevo];
            }
            if (payload.eventType === "UPDATE") {
              const actualizado = payload.new as Aporte;
              return actuales.map((a) => (a.id === actualizado.id ? actualizado : a));
            }
            return actuales;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [reservaId, modoCobro]);

  if (modoCobro !== "grupal" || !tokenCobro) {
    return <FormularioIniciar reservaId={reservaId} montoTotal={montoTotal} />;
  }

  const montoPorAporte = Math.ceil(montoTotal / (cantidadAportes ?? 1));
  const confirmados = aportes.filter((a) => a.estado === "confirmado").length;
  const totalConfirmado = confirmados * montoPorAporte;
  const porcentaje = Math.min(100, Math.round((totalConfirmado / montoTotal) * 100));
  const faltantes = Math.max(0, montoTotal - totalConfirmado);

  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-2.5 bg-terracota-100 px-[18px] py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[22px] font-bold text-terracota-900">
            {formatearColones(totalConfirmado)}{" "}
            <span className="text-[13px] font-semibold text-terracota-800 opacity-75">
              de {formatearColones(montoTotal)}
            </span>
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-terracota-800">
            {confirmados} de {cantidadAportes}
          </span>
        </div>
        <div className="h-[9px] overflow-hidden rounded-full bg-terracota-900/15">
          <div
            className="h-full rounded-full bg-terracota-700 transition-all duration-300"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="text-[12px] text-terracota-800 opacity-85">
          {faltantes > 0
            ? `Faltan ${formatearColones(faltantes)} · la cancha se confirma al completar el monto`
            : "Monto completo — validando los últimos comprobantes"}
        </p>
      </Card>

      <Card className="gap-2 px-4 py-4">
        <p className="kicker">Link para tus amigos</p>
        <CopiarLink url={`${origenSitio}/pago/${tokenCobro}`} />
      </Card>

      {aportes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-bold">Quiénes han pagado ({aportes.length})</p>
          <ul className="flex flex-col gap-2">
            {aportes.map((aporte) => (
              <li
                key={aporte.id}
                className="flex items-center justify-between gap-2 rounded-slot bg-muted px-3.5 py-2.5"
              >
                <span className="truncate text-[13.5px] font-semibold">{aporte.nombre}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${claseChip(aporte.estado)}`}>
                  {ETIQUETA_ESTADO_APORTE[aporte.estado]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Aviso tono="info">
        Si a la hora del partido falta plata, te avisamos para que decidas: cubrir la diferencia o
        cancelar sin costo.
      </Aviso>
    </div>
  );
}
