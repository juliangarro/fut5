import { createClient } from "@/lib/supabase/server";
import { ListaCanchas } from "./ListaCanchas";
import { parsearAmenidades } from "@/lib/amenidades";
import { hoyCR, sumarDiasCR } from "@/lib/fecha";
import { Aviso } from "@/components/shared/Aviso";

export default async function CanchasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nombre = "";
  if (user) {
    const { data: perfil } = await supabase.from("usuarios").select("nombre").eq("id", user.id).single();
    nombre = perfil?.nombre ?? "";
  }

  const { data: canchas, error } = await supabase
    .from("canchas")
    .select("id, nombre, descripcion, rating_promedio, fotos, amenidades")
    .order("rating_promedio", { ascending: false });

  if (error) {
    return (
      <div className="px-[22px] pt-[52px]">
        <Aviso tono="error">No se pudieron cargar las canchas: {error.message}</Aviso>
      </div>
    );
  }

  // D4: mínimo de slots.precio disponible en los próximos 14 días, por cancha.
  const hoy = hoyCR();
  const en14 = sumarDiasCR(hoy, 14);
  const { data: slotsDisponibles } = await supabase
    .from("slots")
    .select("cancha_id, precio")
    .eq("estado", "disponible")
    .gte("fecha", hoy)
    .lte("fecha", en14);

  const precioMinimoPorCancha = new Map<string, number>();
  for (const slot of slotsDisponibles ?? []) {
    const actual = precioMinimoPorCancha.get(slot.cancha_id);
    if (actual === undefined || slot.precio < actual) {
      precioMinimoPorCancha.set(slot.cancha_id, slot.precio);
    }
  }

  const canchasConDatos = canchas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    ratingPromedio: c.rating_promedio,
    fotoUrl: c.fotos?.[0]
      ? supabase.storage.from("fotos-cancha").getPublicUrl(c.fotos[0]).data.publicUrl
      : null,
    amenidades: parsearAmenidades(c.amenidades),
    precioDesde: precioMinimoPorCancha.get(c.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-4 pb-6">
      <ListaCanchas canchas={canchasConDatos} nombre={nombre} />
    </div>
  );
}
