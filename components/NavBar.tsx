import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function NavBar({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
      <nav className="flex gap-4 overflow-x-auto text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex min-h-11 shrink-0 items-center font-medium hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
          <LogOut className="size-4" />
          Salir
        </Button>
      </form>
    </header>
  );
}
