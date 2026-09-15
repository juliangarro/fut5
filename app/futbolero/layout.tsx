import { NavBar } from "@/components/NavBar";

const LINKS = [
  { href: "/futbolero/canchas", label: "Buscar canchas" },
  { href: "/futbolero/reservas", label: "Mis reservas" },
];

export default function FutboleroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar links={LINKS} />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
