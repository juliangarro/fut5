"use client";

import { cn } from "@/lib/utils";

export function ChipFiltro({
  activo,
  onClick,
  children,
  className,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "flex h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium transition-colors",
        activo
          ? "bg-primary text-primary-foreground font-bold"
          : "border border-border bg-transparent text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
