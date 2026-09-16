"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  puntaje,
  tamaño = "sm",
  onChange,
}: {
  puntaje: number;
  tamaño?: "sm" | "lg";
  onChange?: (puntaje: number) => void;
}) {
  const modoInput = Boolean(onChange);
  const tamañoIcono = tamaño === "lg" ? "size-9" : "size-4";

  return (
    <div className="flex items-center gap-0.5" role={modoInput ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((valor) => (
        <button
          key={valor}
          type="button"
          disabled={!modoInput}
          onClick={() => onChange?.(valor)}
          aria-label={modoInput ? `${valor} estrella${valor > 1 ? "s" : ""}` : undefined}
          className={cn(
            "flex items-center justify-center",
            modoInput && "min-h-11 min-w-11 -m-2 rounded-lg hover:bg-muted",
            !modoInput && "pointer-events-none"
          )}
        >
          <Star
            className={cn(
              tamañoIcono,
              valor <= puntaje ? "fill-brand text-brand" : "fill-none text-border"
            )}
          />
        </button>
      ))}
    </div>
  );
}
