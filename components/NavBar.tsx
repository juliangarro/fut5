"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Marca } from "@/components/shared/Marca";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";

export function NavBar({
  links,
  nombre,
}: {
  links: { href: string; label: string }[];
  nombre: string;
}) {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between bg-card px-6 py-3.5">
      <Marca tamaño="sm" />
      <nav className="flex gap-1.5">
        {links.map((link) => {
          const activo = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex h-11 items-center rounded-full px-4 text-[16px] font-medium",
                activo ? "bg-primary font-bold text-primary-foreground" : "text-neutral-800 hover:bg-accent"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <Avatar nombre={nombre} />
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
            <LogOut className="size-4" />
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
