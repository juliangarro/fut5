import { NavBar } from "@/components/NavBar";

const LINKS = [
  { href: "/admin", label: "Mis canchas" },
  { href: "/admin/canchas/nueva", label: "Nueva cancha" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar links={LINKS} />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
