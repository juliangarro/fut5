"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function minutosRestantes(expiraAt: string | null): number | null {
  if (!expiraAt) return null;
  return Math.round((new Date(expiraAt).getTime() - Date.now()) / 60000);
}

export function ContadorExpiracion({
  expiraAt,
  formato = "largo",
  className,
}: {
  expiraAt: string | null;
  formato?: "corto" | "largo";
  className?: string;
}) {
  const [minutos, setMinutos] = useState(() => minutosRestantes(expiraAt));

  useEffect(() => {
    const id = setInterval(() => setMinutos(minutosRestantes(expiraAt)), 15000);
    return () => clearInterval(id);
  }, [expiraAt]);

  if (minutos === null) return null;

  const vencido = minutos <= 0;
  const masDe20 = minutos > 20;
  const texto = vencido
    ? "Venciendo…"
    : formato === "corto"
      ? `Vence en ${minutos} min`
      : `vence en ${minutos} min`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
        vencido || !masDe20 ? "bg-terracota-200 text-terracota-900" : "bg-sage-200 text-sage-900",
        className
      )}
    >
      <Clock className="size-4" />
      {texto}
    </span>
  );
}
