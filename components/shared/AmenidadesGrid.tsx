import { AMENIDADES_DISPONIBLES, type AmenidadKey } from "@/lib/amenidades";

export function AmenidadesGrid({ amenidades }: { amenidades: AmenidadKey[] }) {
  const activas = AMENIDADES_DISPONIBLES.filter((a) => amenidades.includes(a.key));
  if (activas.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {activas.map((a) => (
        <div key={a.key} className="flex items-center gap-2 text-sm text-foreground">
          <a.icono className="size-4 shrink-0 text-muted-foreground" />
          {a.label}
        </div>
      ))}
    </div>
  );
}
