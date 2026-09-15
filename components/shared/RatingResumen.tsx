import { RatingStars } from "./RatingStars";

// puntaje siempre es 1-5 (constraint de DB), así que un promedio de
// exactamente 0 solo puede significar "sin calificaciones todavía" —
// mostrar "0.0" ahí se lee como una nota real en vez de la ausencia de una.
export function RatingResumen({ ratingPromedio }: { ratingPromedio: number }) {
  if (ratingPromedio === 0) {
    return <span className="text-sm text-muted-foreground">Sin calificaciones todavía</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <RatingStars puntaje={Math.round(ratingPromedio)} />
      <span className="text-sm text-muted-foreground">{ratingPromedio.toFixed(1)}</span>
    </div>
  );
}
