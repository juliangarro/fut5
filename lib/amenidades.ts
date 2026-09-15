import {
  Car,
  ShowerHead,
  Lightbulb,
  Umbrella,
  Coffee,
  Users,
  Wifi,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type AmenidadKey =
  | "parqueo"
  | "duchas"
  | "iluminacion"
  | "techada"
  | "cafeteria"
  | "graderias"
  | "wifi"
  | "seguridad";

export const AMENIDADES_DISPONIBLES: { key: AmenidadKey; label: string; icono: LucideIcon }[] = [
  { key: "parqueo", label: "Parqueo", icono: Car },
  { key: "duchas", label: "Duchas y vestidores", icono: ShowerHead },
  { key: "iluminacion", label: "Iluminación nocturna", icono: Lightbulb },
  { key: "techada", label: "Cancha techada", icono: Umbrella },
  { key: "cafeteria", label: "Cafetería / bar", icono: Coffee },
  { key: "graderias", label: "Graderías", icono: Users },
  { key: "wifi", label: "WiFi", icono: Wifi },
  { key: "seguridad", label: "Seguridad / vigilancia", icono: ShieldCheck },
];

// canchas.amenidades es jsonb — se guarda como array de AmenidadKey.
export function parsearAmenidades(valor: unknown): AmenidadKey[] {
  if (!Array.isArray(valor)) return [];
  const claves = new Set(AMENIDADES_DISPONIBLES.map((a) => a.key));
  return valor.filter((v): v is AmenidadKey => typeof v === "string" && claves.has(v as AmenidadKey));
}
