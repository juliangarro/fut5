"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CanchaCard } from "@/components/shared/CanchaCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

type Cancha = {
  id: string;
  nombre: string;
  descripcion: string | null;
  rating_promedio: number;
  fotoUrl: string | null;
};

const FILTROS_RATING = [
  { label: "Todas", min: 0 },
  { label: "3+ ⭐", min: 3 },
  { label: "4+ ⭐", min: 4 },
];

export function ListaCanchas({ canchas }: { canchas: Cancha[] }) {
  const [ratingMinimo, setRatingMinimo] = useState(0);
  const filtradas = canchas.filter((c) => c.rating_promedio >= ratingMinimo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto">
        {FILTROS_RATING.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setRatingMinimo(f.min)}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition",
              ratingMinimo === f.min
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          icono={Search}
          titulo={canchas.length === 0 ? "Todavía no hay canchas publicadas" : "Ninguna cancha coincide"}
          descripcion={
            canchas.length === 0
              ? "Volvé más tarde."
              : "Probá con un filtro de rating más bajo."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtradas.map((cancha) => (
            <CanchaCard
              key={cancha.id}
              id={cancha.id}
              nombre={cancha.nombre}
              descripcion={cancha.descripcion}
              ratingPromedio={cancha.rating_promedio}
              fotoUrl={cancha.fotoUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
