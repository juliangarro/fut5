"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarraAccionInferior } from "@/components/shared/BarraAccionInferior";
import { formatearColones, formatearRangoHoras } from "@/lib/formato";
import { franjaDeHora, ETIQUETA_FRANJA, type Franja } from "@/lib/franjas";
import { sumarDiasCR } from "@/lib/fecha";
import { cn } from "@/lib/utils";
import type { EstadoSlot } from "@/lib/types/database";

const DIAS_A_MOSTRAR = 7;
const ORDEN_FRANJAS: Franja[] = ["manana", "tarde", "noche"];

export type SlotParaElegir = {
  id: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  estado: EstadoSlot;
};

// diferenciaDias/formatearDia trabajan sobre strings YYYY-MM-DD (nunca
// Date/new Date() en hora local del navegador) -- ver bug UAT #1: "hoy"
// tiene que venir del servidor (hoyCR(), CR-timezone-aware) para no
// desincronizarse con la ventana de 7 días que se le pide a la DB. El
// mediodía UTC como ancla evita que un borde de DST/zona horaria corra la
// fecha un día para el lado equivocado al construir el Date solo para
// mostrar el nombre del día/número.
function diferenciaDias(desdeISO: string, hastaISO: string) {
  const aUTC = (iso: string) => {
    const [anio, mes, dia] = iso.split("-").map(Number);
    return Date.UTC(anio, mes - 1, dia, 12);
  };
  return Math.round((aUTC(hastaISO) - aUTC(desdeISO)) / 86_400_000);
}

function formatearDia(iso: string, hoyISO: string) {
  const fecha = new Date(`${iso}T12:00:00`);
  const numero = fecha.getDate();
  const diffDias = diferenciaDias(hoyISO, iso);
  if (diffDias === 0) return { corto: "Hoy", numero };
  if (diffDias === 1) return { corto: "Mañana", numero };
  const corto = fecha.toLocaleDateString("es-CR", { weekday: "short" }).replace(".", "");
  return { corto, numero };
}

// Ver plan-rediseno-dale-cancha.md Fase 6: tabs de día (scroll horizontal) +
// horarios agrupados en franjas mañana/tarde/noche. disponible =
// seleccionable; retenido/reservado = "Ocupado"; bloqueado = "No disponible".
// Seleccionar resalta el horario y muestra la barra "Continuar" -- nunca
// navega automáticamente al tocar, para poder cambiar de selección.
export function SlotPicker({
  canchaId,
  slots,
  franjaMasPedida,
  hoyISO,
}: {
  canchaId: string;
  slots: SlotParaElegir[];
  franjaMasPedida: Franja | null;
  // "Hoy" calculado en el servidor (hoyCR(), ver lib/fecha.ts) -- nunca se
  // recalcula acá con `new Date()`, que puede desincronizarse de la fecha
  // real de Costa Rica según la hora/zona horaria del navegador del
  // usuario (bug UAT #1).
  hoyISO: string;
}) {
  const dias = useMemo(() => {
    return Array.from({ length: DIAS_A_MOSTRAR }, (_, i) => sumarDiasCR(hoyISO, i));
  }, [hoyISO]);

  const [diaActivo, setDiaActivo] = useState(dias[0]);
  const [slotSeleccionado, setSlotSeleccionado] = useState<SlotParaElegir | null>(null);

  const slotsPorDiaYFranja = useMemo(() => {
    const mapa = new Map<string, Map<Franja, SlotParaElegir[]>>();
    for (const slot of slots) {
      if (!mapa.has(slot.fecha)) mapa.set(slot.fecha, new Map());
      const porFranja = mapa.get(slot.fecha)!;
      const franja = franjaDeHora(slot.hora_inicio);
      if (!porFranja.has(franja)) porFranja.set(franja, []);
      porFranja.get(franja)!.push(slot);
    }
    for (const porFranja of mapa.values()) {
      for (const lista of porFranja.values()) {
        lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      }
    }
    return mapa;
  }, [slots]);

  return (
    <div className={cn("flex flex-col gap-5", slotSeleccionado && "pb-[110px]")}>
      <Tabs value={diaActivo} onValueChange={(v) => setDiaActivo(v as string)}>
        <div className="overflow-x-auto">
          <TabsList variant="line" className="w-max gap-2">
            {dias.map((iso) => {
              const { corto, numero } = formatearDia(iso, hoyISO);
              return (
                <TabsTrigger
                  key={iso}
                  value={iso}
                  className="flex h-auto w-14 shrink-0 flex-col gap-0.5 rounded-dia bg-card py-2 text-neutral-800 data-active:!bg-primary data-active:!text-primary-foreground data-active:shadow-none data-active:after:opacity-0"
                >
                  <span className="text-xs">{corto}</span>
                  <span className="text-[19px] font-bold">{numero}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {dias.map((iso) => {
          const porFranja = slotsPorDiaYFranja.get(iso);
          const hayHorarios = porFranja && porFranja.size > 0;
          return (
            <TabsContent key={iso} value={iso} className="flex flex-col gap-5 pt-3">
              {!hayHorarios && (
                <p className="py-6 text-center text-[15px] text-neutral-800">No hay horarios este día.</p>
              )}
              {ORDEN_FRANJAS.filter((f) => porFranja?.has(f)).map((franja) => (
                <div key={franja} className="flex flex-col gap-2.5">
                  <p
                    className={cn(
                      "kicker",
                      franja === franjaMasPedida && "text-terracota-700"
                    )}
                  >
                    {franja === franjaMasPedida
                      ? `${ETIQUETA_FRANJA[franja]} · la más pedida`
                      : ETIQUETA_FRANJA[franja]}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {porFranja!.get(franja)!.map((slot) => {
                      const disponible = slot.estado === "disponible";
                      const seleccionado = slotSeleccionado?.id === slot.id;
                      const etiquetaEstado =
                        slot.estado === "bloqueado" ? "No disponible" : disponible ? null : "Ocupado";
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={!disponible}
                          aria-pressed={seleccionado}
                          onClick={() => setSlotSeleccionado(slot)}
                          className={cn(
                            "flex min-h-12 min-w-[100px] flex-col items-center justify-center gap-0.5 rounded-slot px-3 py-2",
                            disponible
                              ? seleccionado
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "border border-border bg-card"
                              : "cursor-not-allowed bg-neutral-200 text-neutral-800"
                          )}
                        >
                          <span className="text-[16px] font-bold">
                            {etiquetaEstado
                              ? `${slot.hora_inicio.slice(0, 5)} · ${etiquetaEstado}`
                              : slot.hora_inicio.slice(0, 5)}
                          </span>
                          {!etiquetaEstado && (
                            <span className="text-xs">{formatearColones(slot.precio)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>
          );
        })}
      </Tabs>

      {slotSeleccionado && (
        <BarraAccionInferior
          izquierda={
            <div aria-live="polite">
              <p className="text-[13px] text-neutral-800">
                {formatearDia(slotSeleccionado.fecha, hoyISO).corto}{" "}
                {formatearRangoHoras(slotSeleccionado.hora_inicio, slotSeleccionado.hora_fin)}
              </p>
              <p className="text-[20px] font-bold">{formatearColones(slotSeleccionado.precio)}</p>
            </div>
          }
          derecha={
            <Button
              size="lg"
              className="flex-1"
              nativeButton={false}
              render={<Link href={`/futbolero/canchas/${canchaId}/reservar/${slotSeleccionado.id}`} />}
            >
              Continuar
            </Button>
          }
        />
      )}
    </div>
  );
}
