import { cn } from "@/lib/utils";

export function BarraAccionInferior({
  izquierda,
  derecha,
  className,
}: {
  izquierda?: React.ReactNode;
  derecha: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-border bg-background px-5 pt-3.5 pb-[max(30px,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {izquierda && <div className="flex-1 min-w-0">{izquierda}</div>}
      {derecha}
    </div>
  );
}
