import { cn } from "@/lib/utils";

export function Marca({
  tamaño = "default",
  className,
}: {
  tamaño?: "default" | "sm";
  className?: string;
}) {
  const circulo = tamaño === "sm" ? "size-[30px]" : "size-[34px]";
  const texto = tamaño === "sm" ? "text-base" : "text-[19px]";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("flex items-center justify-center rounded-full bg-brand text-background", circulo)}>
        <svg viewBox="0 0 24 24" className="size-[60%]" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <path
            d="M12 6.5 15 9 13.8 13 10.2 13 9 9Z M12 6.5 12 3.5 M15 9 17.7 8 M13.8 13 15.6 15.8 M10.2 13 8.4 15.8 M9 9 6.3 8"
            stroke="var(--background)"
            strokeWidth="1"
            strokeLinejoin="round"
            fill="var(--background)"
          />
        </svg>
      </span>
      <span className={cn("font-bold tracking-[-0.02em] text-foreground", texto)}>Dale Cancha</span>
    </div>
  );
}
