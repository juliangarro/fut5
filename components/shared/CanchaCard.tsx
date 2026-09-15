import Link from "next/link";
import { ImageOff } from "lucide-react";
import { RatingStars } from "./RatingStars";

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
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5 transition hover:border-primary/40"
    >
      <div className="flex aspect-video items-center justify-center bg-muted">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt={nombre} className="size-full object-cover" />
        ) : (
          <ImageOff className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h3 className="font-medium text-foreground">{nombre}</h3>
        {descripcion && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{descripcion}</p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RatingStars puntaje={Math.round(ratingPromedio)} />
            <span className="text-sm text-muted-foreground">{ratingPromedio.toFixed(1)}</span>
          </div>
          {precioDesde != null && (
            <span className="text-sm font-medium text-foreground">
              desde ₡{precioDesde.toLocaleString("es-CR")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
