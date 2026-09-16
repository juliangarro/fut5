import { FotoCancha } from "@/components/shared/FotoCancha";

/**
 * Fondo puramente presentacional detrás de la hoja de pago/comprobante:
 * da contexto (qué cancha, qué horario) sin ser interactivo. La hoja en sí
 * (HojaInferior) es lo único operable en esta pantalla.
 */
export function FondoDetalleCancha({
  nombre,
  fotoUrl,
}: {
  nombre: string;
  fotoUrl: string | null;
}) {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 opacity-50 blur-[1px]">
      <FotoCancha url={fotoUrl} alt={nombre} className="h-[240px] w-full rounded-none" />
      <div className="px-5 pt-4">
        <p className="text-[25px] font-bold">{nombre}</p>
      </div>
    </div>
  );
}
