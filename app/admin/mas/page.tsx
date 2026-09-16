import Link from "next/link";
import { LandPlot, ChartColumn, Plus, ChevronRight } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/admin/canchas", label: "Canchas", icono: LandPlot },
  { href: "/admin/insights", label: "Estadísticas", icono: ChartColumn },
  { href: "/admin/canchas/nueva", label: "Nueva cancha", icono: Plus },
];

export default function MasAdminPage() {
  return (
    <div className="flex flex-col gap-2 px-5 pt-[52px] pb-6">
      <h1 className="mb-3 text-2xl font-bold">Más</h1>
      <ul className="flex flex-col overflow-hidden rounded-card bg-card">
        {LINKS.map((link) => {
          const Icono = link.icono;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex h-14 items-center justify-between gap-3 border-b border-border px-4 text-[16px] font-medium last:border-b-0"
              >
                <span className="flex items-center gap-3">
                  <Icono className="size-5 text-neutral-700" />
                  {link.label}
                </span>
                <ChevronRight className="size-4 text-neutral-600" />
              </Link>
            </li>
          );
        })}
      </ul>
      <form action={logout} className="mt-2">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Salir
        </Button>
      </form>
    </div>
  );
}
