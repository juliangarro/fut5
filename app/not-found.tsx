import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Antes no existía — Next mostraba su 404 genérico y desnudo (sin el fondo
// crema ni el sistema de diseño de la app) cada vez que un notFound() de
// cualquier página disparaba. Reportado por el usuario como "pantalla
// negra" al navegar: sin este archivo, cualquier notFound() (uno legítimo,
// como una reserva borrada, o uno por un bug — ver el fix en
// reservas/[reservaId]/page.tsx) se veía como una página en blanco sin
// ninguna relación visual con el resto de Dale Cancha.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <CircleHelp className="size-10 text-neutral-700" aria-hidden="true" />
      <div>
        <p className="text-[19px] font-bold text-foreground">No encontramos esta página</p>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Puede que el link esté vencido o que la reserva ya no exista.
        </p>
      </div>
      <Button render={<Link href="/" />} nativeButton={false} className="mt-2">
        Volver al inicio
      </Button>
    </div>
  );
}
