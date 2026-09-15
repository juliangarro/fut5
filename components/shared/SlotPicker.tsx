"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EstadoSlot } from "@/lib/types/database";

const DIAS_A_MOSTRAR = 7;

export type SlotParaElegir = {
  id: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  estado: EstadoSlot;
};

function formatearDia(fecha: Date, hoy: Date) {
  const diffDias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  if (diffDias === 0) return { corto: "Hoy", largo: "Hoy" };
  if (diffDias === 1) return { corto: "Mañana", largo: "Mañana" };
  const largo = fecha.toLocaleDateString("es-CR", { weekday: "short", day: "numeric" });
  return { corto: largo, largo };
}

// Ver plan-ui-ux-canchas-fut5-cr.md 4.1: tabs de día (scroll horizontal) +
// lista vertical de horarios del día. disponible = seleccionable;
// retenido/reservado = "Ocupado"; bloqueado = "No disponible". Seleccionar
// resalta el horario y muestra un botón fijo "Continuar" — nunca navega
// automáticamente al tocar, para permitir cambiar de selección sin fricción.
export function SlotPicker({ canchaId, slots }: { canchaId: string; slots: SlotParaElegir[] }) {
  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dias = useMemo(() => {
    return Array.from({ length: DIAS_A_MOSTRAR }, (_, i) => {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      return fecha;
    });
  }, [hoy]);

  const [diaActivo, setDiaActivo] = useState(dias[0].toISOString().slice(0, 10));
  const [slotSeleccionado, setSlotSeleccionado] = useState<SlotParaElegir | null>(null);

  const slotsPorDia = useMemo(() => {
    const mapa = new Map<string, SlotParaElegir[]>();
    for (const slot of slots) {
      if (!mapa.has(slot.fecha)) mapa.set(slot.fecha, []);
      mapa.get(slot.fecha)!.push(slot);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    }
    return mapa;
  }, [slots]);

  return (
    <div className="flex flex-col gap-4 pb-20">
      <Tabs value={diaActivo} onValueChange={(v) => setDiaActivo(v as string)}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            {dias.map((fecha) => {
              const iso = fecha.toISOString().slice(0, 10);
              const { corto } = formatearDia(fecha, hoy);
              return (
                <TabsTrigger key={iso} value={iso} className="min-w-16">
                  {corto}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {dias.map((fecha) => {
          const iso = fecha.toISOString().slice(0, 10);
          const slotsDelDia = slotsPorDia.get(iso) ?? [];
          return (
            <TabsContent key={iso} value={iso} className="flex flex-col gap-2 pt-2">
              {slotsDelDia.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay horarios este día.
                </p>
              )}
              {slotsDelDia.map((slot) => {
                const disponible = slot.estado === "disponible";
                const seleccionado = slotSeleccionado?.id === slot.id;
                const etiquetaEstado =
                  slot.estado === "bloqueado"
                    ? "No disponible"
                    : slot.estado === "disponible"
                      ? null
                      : "Ocupado";
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!disponible}
                    onClick={() => setSlotSeleccionado(slot)}
                    className={cn(
                      "flex min-h-14 items-center justify-between rounded-xl border px-4 py-2.5 text-left transition",
                      disponible
                        ? seleccionado
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/40"
                        : "cursor-not-allowed border-border bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="font-medium">
                      {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)}
                    </span>
                    {etiquetaEstado ? (
                      <span className="text-sm">{etiquetaEstado}</span>
                    ) : (
                      <span className="font-medium text-foreground">
                        ₡{slot.precio.toLocaleString("es-CR")}
                      </span>
                    )}
                  </button>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>

      {slotSeleccionado && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-4 shadow-lg">
          <Button
            size="lg"
            className="h-11 w-full max-w-md mx-auto flex"
            render={<Link href={`/futbolero/canchas/${canchaId}/reservar/${slotSeleccionado.id}`} />}
          >
            Continuar con este horario
          </Button>
        </div>
      )}
    </div>
  );
}
