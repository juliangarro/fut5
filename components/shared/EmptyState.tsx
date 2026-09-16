import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  tono = "neutral",
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
  accion?: { texto: string; href: string };
  /** "positivo" para estados vacíos que son buenas noticias (ej. cola de validaciones vacía) — ver 7.2 */
  tono?: "neutral" | "positivo";
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
      <Icono className={tono === "positivo" ? "size-10 text-sage-700" : "size-10 text-neutral-700"} />
      <div>
        <p className="text-[17px] font-bold text-foreground">{titulo}</p>
        {descripcion && <p className="mt-1 text-[15px] text-muted-foreground">{descripcion}</p>}
      </div>
      {accion && (
        <Button render={<Link href={accion.href} />} nativeButton={false} className="mt-2">
          {accion.texto}
        </Button>
      )}
    </div>
  );
}
