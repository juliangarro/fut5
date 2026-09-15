import Link from "next/link";
import { logout } from "@/app/login/actions";

export function NavBar({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <nav className="flex gap-4 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="font-medium hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <form action={logout}>
        <button type="submit" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          Cerrar sesión
        </button>
      </form>
    </header>
  );
}
