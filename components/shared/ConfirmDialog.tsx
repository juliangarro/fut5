"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Confirmación obligatoria antes de una acción destructiva (cancelar
// reserva, rechazar comprobante, bloquear/eliminar un horario) — ver
// plan-ui-ux-canchas-fut5-cr.md 7.4. Nunca ejecutar esas acciones desde un
// solo tap.
export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  destructivo = true,
  cargando = false,
  onConfirmar,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destructivo?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{textoCancelar}</DialogClose>
          <Button
            variant={destructivo ? "destructive" : "default"}
            disabled={cargando}
            onClick={onConfirmar}
          >
            {cargando ? "…" : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
