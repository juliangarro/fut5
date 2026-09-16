import Link from "next/link";
import { Star } from "lucide-react";
import { FotoCancha } from "@/components/shared/FotoCancha";
import { formatearColones } from "@/lib/formato";

export function CanchaCard({
  id,
  nombre,
  descripcion,
  ratingPromedio,
  fotoUrl,
  precioDesde,
}: {
  id: string;
  nombre: string;
  descripcion?: string | null;
  ratingPromedio: number;
  fotoUrl?: string | null;
  precioDesde?: number | null;
}) {
  return (
    <Link
      href={`/futbolero/canchas/${id}`}
      className="flex flex-col overflow-hidden rounded-card bg-card shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <FotoCancha url={fotoUrl} alt={nombre} className="h-24 w-full rounded-none" />
      <div className="flex flex-col gap-0.5 pt-3 px-3.5 pb-3.5">
        <h3 className="text-[15px] font-bold text-foreground">{nombre}</h3>
        <div className="flex items-center gap-1 text-[13px] text-neutral-800">
          {ratingPromedio > 0 ? (
            <>
              <Star className="size-3 shrink-0 fill-brand stroke-brand" />
              <span>{ratingPromedio.toFixed(1)}</span>
            </>
          ) : (
            <span>Nueva</span>
          )}
          {descripcion && <span className="truncate">· {descripcion}</span>}
        </div>
        {precioDesde != null && (
          <span className="text-[15px] font-bold text-foreground">
            desde {formatearColones(precioDesde)}
          </span>
        )}
      </div>
    </Link>
  );
}
