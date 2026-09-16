import { iniciales } from "@/lib/formato";
import { cn } from "@/lib/utils";

export function Avatar({
  nombre,
  className,
}: {
  nombre: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-300 text-sm font-bold text-sage-900",
        className
      )}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  );
}
