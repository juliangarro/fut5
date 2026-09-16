import { CanchaIlustracion } from "@/components/CanchaIlustracion";
import { cn } from "@/lib/utils";

/**
 * Foto de una cancha con el tratamiento `washed` (D6/sección 4.1 de
 * plan-rediseno-dale-cancha.md). Sin URL, cae a la ilustración vectorial.
 * NUNCA usar para comprobantes de pago: el filtro baja el contraste y el
 * admin necesita leer el monto con precisión.
 */
export function FotoCancha({
  url,
  alt,
  className,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!url) {
    return (
      <div className={cn("overflow-hidden rounded-card bg-sage-100", className)}>
        <CanchaIlustracion className="size-full" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={cn("washed size-full overflow-hidden rounded-card object-cover", className)}
    />
  );
}
