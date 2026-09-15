import { NavBar } from "@/components/NavBar";

const LINKS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/validaciones", label: "Validaciones" },
  { href: "/admin/insights", label: "Estadísticas" },
  { href: "/admin/canchas/nueva", label: "Nueva cancha" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar links={LINKS} />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
