import { NavBar } from "@/components/NavBar";

const LINKS = [
  { href: "/futbolero/canchas", label: "Buscar" },
  { href: "/futbolero/reservas", label: "Mis reservas" },
];

export default function FutboleroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar links={LINKS} />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
