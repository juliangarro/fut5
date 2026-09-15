import { redirect } from "next/navigation";

// Reemplazada por la cola global /admin/validaciones (doc 6.2: agrega todas
// las canchas del admin en una sola vista, no una por cancha). Se deja este
// redirect en vez de borrar la ruta para no romper links ya compartidos.
export default async function ValidacionPorCanchaPage() {
  redirect("/admin/validaciones");
}
