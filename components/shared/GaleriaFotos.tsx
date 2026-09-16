"use client";

import { useState } from "react";
import { CanchaIlustracion } from "@/components/CanchaIlustracion";
import { BotonVolver } from "@/components/shared/BotonVolver";

// Carrusel simple con scroll-snap nativo — sin JS para el swipe, funciona
// igual de bien en mobile que en desktop. El contador "1 / N" sí necesita
// JS (IntersectionObserver por foto) para saber cuál está a la vista.
export function GaleriaFotos({ urls, alt }: { urls: string[]; alt: string }) {
  const [indice, setIndice] = useState(0);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const contenedor = e.currentTarget;
    const ancho = contenedor.clientWidth;
    if (ancho === 0) return;
    const nuevoIndice = Math.round(contenedor.scrollLeft / ancho);
    setIndice(Math.min(Math.max(nuevoIndice, 0), urls.length - 1));
  }

  return (
    <div className="relative h-[196px] w-full">
      <div className="absolute top-[52px] left-5 z-10">
        <BotonVolver href="/futbolero/canchas" aria-label="Volver a Buscar" sobreFoto />
      </div>

      {urls.length === 0 ? (
        <CanchaIlustracion className="h-[196px] w-full" />
      ) : (
        <>
          <div
            onScroll={onScroll}
            className="flex h-[196px] w-full snap-x snap-mandatory overflow-x-auto"
          >
            {urls.map((url, i) => (
              <div key={url} className="h-[196px] w-full shrink-0 snap-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${alt} — foto ${i + 1}`}
                  className="washed h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          {urls.length > 1 && (
            <span className="absolute top-[52px] right-5 z-10 flex h-9 items-center rounded-full bg-background px-3 text-sm font-semibold shadow-sm">
              {indice + 1} / {urls.length}
            </span>
          )}
        </>
      )}
    </div>
  );
}
