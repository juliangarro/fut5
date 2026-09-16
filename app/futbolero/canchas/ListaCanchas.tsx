"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { CanchaCard } from "@/components/shared/CanchaCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar } from "@/components/shared/Avatar";
import { ChipFiltro } from "@/components/shared/ChipFiltro";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AmenidadKey } from "@/lib/amenidades";

type Cancha = {
  id: string;
  nombre: string;
  descripcion: string | null;
  ratingPromedio: number;
  fotoUrl: string | null;
  amenidades: AmenidadKey[];
  precioDesde: number | null;
};

const CHIPS: { key: AmenidadKey; label: string }[] = [
  { key: "techada", label: "Techada" },
  { key: "parqueo", label: "Parqueo" },
  { key: "duchas", label: "Duchas" },
  { key: "iluminacion", label: "Iluminación" },
];

function sinTildes(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ListaCanchas({ canchas, nombre }: { canchas: Cancha[]; nombre: string }) {
  const [busqueda, setBusqueda] = useState("");
  const [amenidadesActivas, setAmenidadesActivas] = useState<AmenidadKey[]>([]);
  const [orden, setOrden] = useState<"rating" | "precio">("rating");

  const hayPrecios = canchas.some((c) => c.precioDesde != null);

  const filtradas = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    let resultado = canchas.filter((c) => {
      const coincideBusqueda =
        q === "" || sinTildes(c.nombre).includes(q) || sinTildes(c.descripcion ?? "").includes(q);
      const coincideAmenidades = amenidadesActivas.every((a) => c.amenidades.includes(a));
      return coincideBusqueda && coincideAmenidades;
    });

    resultado = [...resultado].sort((a, b) => {
      if (orden === "precio") {
        if (a.precioDesde == null) return 1;
        if (b.precioDesde == null) return -1;
        return a.precioDesde - b.precioDesde;
      }
      return b.ratingPromedio - a.ratingPromedio;
    });

    return resultado;
  }, [canchas, busqueda, amenidadesActivas, orden]);

  function alternarAmenidad(key: AmenidadKey) {
    setAmenidadesActivas((actual) =>
      actual.includes(key) ? actual.filter((a) => a !== key) : [...actual, key]
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3.5 rounded-b-header bg-card px-5 pt-[52px] pb-4 md:rounded-none md:bg-transparent md:px-0 md:pt-6 md:pb-0">
        <div className="flex items-center justify-between md:hidden">
          <span className="text-[19px] font-bold">Dale Cancha</span>
          <Avatar nombre={nombre} />
        </div>
        <div className="flex h-[50px] items-center gap-2 rounded-full bg-background px-4">
          <Search className="size-[18px] shrink-0 text-neutral-600" />
          <label htmlFor="buscar-canchas" className="sr-only">
            Buscar
          </label>
          <input
            id="buscar-canchas"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscá por cancha"
            className="h-full w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-1">
        {CHIPS.map((a) => (
          <ChipFiltro
            key={a.key}
            activo={amenidadesActivas.includes(a.key)}
            onClick={() => alternarAmenidad(a.key)}
          >
            {a.label}
          </ChipFiltro>
        ))}
      </div>

      <div className="flex items-center justify-between px-5">
        <span className="text-[15px] text-neutral-800">
          {filtradas.length} {filtradas.length === 1 ? "cancha" : "canchas"}
        </span>
        <Select value={orden} onValueChange={(v) => setOrden(v as "rating" | "precio")}>
          <SelectTrigger className="h-auto gap-1 border-none bg-transparent p-0 text-[16px] font-bold text-terracota-700 hover:bg-transparent">
            <SelectValue>{(v: string) => (v === "precio" ? "Menor precio" : "Mejor calificadas")}</SelectValue>
            <ChevronDown className="size-4" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Mejor calificadas</SelectItem>
            {hayPrecios && <SelectItem value="precio">Menor precio</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <div className="px-5">
          <EmptyState
            icono={Search}
            titulo={canchas.length === 0 ? "Todavía no hay canchas publicadas" : "Ninguna cancha coincide"}
            descripcion={canchas.length === 0 ? "Volvé más tarde." : "Probá quitando algún filtro."}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 px-5 md:grid-cols-3 lg:grid-cols-4">
          {filtradas.map((cancha) => (
            <CanchaCard
              key={cancha.id}
              id={cancha.id}
              nombre={cancha.nombre}
              descripcion={cancha.descripcion}
              ratingPromedio={cancha.ratingPromedio}
              fotoUrl={cancha.fotoUrl}
              precioDesde={cancha.precioDesde}
            />
          ))}
        </div>
      )}
    </div>
  );
}
