"use client";

import { useState } from "react";
import { AMENIDADES_DISPONIBLES, type AmenidadKey } from "@/lib/amenidades";
import { Badge } from "@/components/ui/badge";

const VISIBLES_POR_DEFECTO = 3;

export function AmenidadesGrid({ amenidades }: { amenidades: AmenidadKey[] }) {
  const [expandido, setExpandido] = useState(false);
  const activas = AMENIDADES_DISPONIBLES.filter((a) => amenidades.includes(a.key));
  if (activas.length === 0) return null;

  const restantes = activas.length - VISIBLES_POR_DEFECTO;
  const aMostrar = expandido ? activas : activas.slice(0, VISIBLES_POR_DEFECTO);

  return (
    <div className="flex flex-wrap gap-2">
      {aMostrar.map((a) => (
        <Badge key={a.key} variant="sage" className="gap-1.5">
          <a.icono className="size-[15px]" />
          {a.label}
        </Badge>
      ))}
      {!expandido && restantes > 0 && (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          aria-expanded={expandido}
          className="inline-flex h-auto w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-800"
        >
          +{restantes}
        </button>
      )}
    </div>
  );
}
