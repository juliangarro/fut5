"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

/**
 * Hoja inferior sobre components/ui/dialog.tsx (Base UI Dialog), así hereda
 * el manejo de foco, Esc y el overlay. `hrefCerrar` es un string (no un
 * callback) porque estas hojas viven en Server Components que solo pueden
 * pasar props serializables: al cerrar, hace router.push(hrefCerrar).
 */
export function HojaInferior({
  titulo,
  abierta,
  hrefCerrar,
  children,
  className,
}: {
  titulo: string;
  abierta: boolean;
  hrefCerrar: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const tituloRef = useRef<HTMLHeadingElement>(null);

  return (
    <DialogPrimitive.Root
      open={abierta}
      onOpenChange={(open) => {
        if (!open) router.push(hrefCerrar);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 isolate z-50 bg-neutral-900/42 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          initialFocus={tituloRef}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-sheet bg-popover px-[22px] pt-3.5 pb-[max(30px,env(safe-area-inset-bottom))] text-popover-foreground shadow-lg outline-none duration-150 motion-reduce:animate-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom md:max-w-md",
            className
          )}
        >
          <span aria-hidden className="mx-auto h-[5px] w-11 shrink-0 rounded-full bg-border" />
          <DialogPrimitive.Title
            ref={tituloRef}
            tabIndex={-1}
            className="text-xl font-bold leading-tight outline-none"
          >
            {titulo}
          </DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
