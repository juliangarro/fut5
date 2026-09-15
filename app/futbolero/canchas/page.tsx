import { createClient } from "@/lib/supabase/server";
import { ListaCanchas } from "./ListaCanchas";

export default async function CanchasPage() {
  const supabase = await createClient();
  const { data: canchas, error } = await supabase
    .from("canchas")
    .select("id, nombre, descripcion, rating_promedio, fotos")
    .order("rating_promedio", { ascending: false });

  if (error) {
    return <p className="text-danger">No se pudieron cargar las canchas: {error.message}</p>;
  }

  const canchasConFoto = canchas.map((c) => ({
    ...c,
    fotoUrl: c.fotos?.[0]
      ? supabase.storage.from("fotos-cancha").getPublicUrl(c.fotos[0]).data.publicUrl
      : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Buscar canchas</h1>
      <ListaCanchas canchas={canchasConFoto} />
    </div>
  );
}
