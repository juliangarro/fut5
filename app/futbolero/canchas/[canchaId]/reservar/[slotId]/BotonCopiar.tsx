"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success("Número copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Copiá el número manualmente.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copiar}>
      {copiado ? <Check /> : <Copy />}
      {copiado ? "Copiado" : "Copiar número"}
    </Button>
  );
}
