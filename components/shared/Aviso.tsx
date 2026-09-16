import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIG = {
  info: { icono: Info, clase: "bg-neutral-100 text-neutral-800" },
  exito: { icono: CircleCheck, clase: "bg-sage-100 text-sage-900" },
  atencion: { icono: TriangleAlert, clase: "bg-terracota-100 text-terracota-900" },
  error: { icono: CircleAlert, clase: "bg-terracota-100 text-terracota-900" },
} as const;

export function Aviso({
  tono,
  children,
  className,
}: {
  tono: keyof typeof CONFIG;
  children: React.ReactNode;
  className?: string;
}) {
  const { icono: Icono, clase } = CONFIG[tono];

  return (
    <div
      role={tono === "error" || tono === "atencion" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-slot px-4 py-3 text-[15px] leading-snug",
        clase,
        className
      )}
    >
      <Icono className="mt-0.5 size-[18px] shrink-0" />
      <div>{children}</div>
    </div>
  );
}
