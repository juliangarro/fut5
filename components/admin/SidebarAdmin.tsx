"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ClipboardCheck, Calendar, LandPlot, ChartColumn, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Marca } from "@/components/shared/Marca";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Panel", icono: LayoutGrid },
  { href: "/admin/validaciones", label: "Validaciones", icono: ClipboardCheck },
  { href: "/admin/horarios", label: "Horarios", icono: Calendar },
  { href: "/admin/canchas", label: "Canchas", icono: LandPlot },
  { href: "/admin/insights", label: "Estadísticas", icono: ChartColumn },
];

export function SidebarAdmin({
  nombre,
  cantidadCanchas,
  pendientes,
}: {
  nombre: string;
  cantidadCanchas: number;
  pendientes: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-[252px] shrink-0 flex-col gap-[26px] bg-card px-[18px] py-[26px]">
      <Marca tamaño="sm" />

      <nav className="flex flex-col gap-1.5">
        {ITEMS.map((item) => {
          const activo = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icono = item.icono;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex h-[46px] items-center justify-between gap-2.5 rounded-full px-4 text-[15px]",
                activo ? "bg-primary font-bold text-primary-foreground" : "text-foreground hover:bg-accent"
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icono className="size-5" />
                {item.label}
              </span>
              {item.href === "/admin/validaciones" && pendientes > 0 && (
                <span
                  aria-label={`${pendientes} pendientes`}
                  className={cn(
                    "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[13px] font-bold",
                    activo ? "bg-background text-terracota-800" : "bg-primary text-primary-foreground"
                  )}
                >
                  {pendientes}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 rounded-full bg-background px-3.5 py-2.5">
          <Avatar nombre={nombre} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{nombre}</p>
            <p className="truncate text-[13px] text-muted-foreground">
              Dueño · {cantidadCanchas} {cantidadCanchas === 1 ? "cancha" : "canchas"}
            </p>
          </div>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <LogOut className="size-4" />
            Salir
          </Button>
        </form>
      </div>
    </aside>
  );
}
