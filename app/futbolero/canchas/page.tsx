import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CanchasPage() {
  const supabase = await createClient();
  const { data: canchas, error } = await supabase
    .from("canchas")
    .select("id, nombre, descripcion, rating_promedio, fotos")
    .order("rating_promedio", { ascending: false });

  if (error) {
    return <p className="text-red-600">No se pudieron cargar las canchas: {error.message}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Canchas disponibles</h1>
      {canchas.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">
          Todavía no hay canchas publicadas.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {canchas.map((cancha) => (
          <li key={cancha.id}>
            <Link
              href={`/futbolero/canchas/${cancha.id}`}
              className="block rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <h2 className="font-medium">{cancha.nombre}</h2>
              {cancha.descripcion && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {cancha.descripcion}
                </p>
              )}
              <p className="mt-2 text-sm">⭐ {cancha.rating_promedio.toFixed(1)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
