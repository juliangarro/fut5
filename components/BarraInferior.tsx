"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Calendar, User, LayoutGrid, ClipboardCheck, Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONOS = {
  search: Search,
  calendar: Calendar,
  user: User,
  layoutGrid: LayoutGrid,
  clipboardCheck: ClipboardCheck,
  ellipsis: Ellipsis,
} as const;

export type ItemBarraInferior = {
  href: string;
  label: string;
  icono: keyof typeof ICONOS;
  contador?: number;
};

export function BarraInferior({
  items,
  ocultarEnSubrutas = false,
}: {
  items: ItemBarraInferior[];
  /** Futbolero: la barra solo aparece en las rutas de primer nivel (Buscar,
   * Mis reservas, Perfil). En detalle/reservar/comprobante/estado no
   * aparece — son pantallas "empujadas", como en el diseño. */
  ocultarEnSubrutas?: boolean;
}) {
  const pathname = usePathname();

  if (ocultarEnSubrutas && !items.some((item) => item.href === pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-card pt-2.5 pb-[max(26px,env(safe-area-inset-bottom))]"
    >
      {items.map((item) => {
        const activo = item.href === pathname;
        const Icono = ICONOS[item.icono];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1",
              activo ? "text-terracota-700 font-bold" : "text-neutral-700"
            )}
          >
            <span className="relative">
              <Icono className="size-6" />
              {typeof item.contador === "number" && item.contador > 0 && (
                <span
                  aria-label={`${item.contador} pendientes`}
                  className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"
                >
                  {item.contador}
                </span>
              )}
            </span>
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
