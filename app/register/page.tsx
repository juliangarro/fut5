import { redirect } from "next/navigation";

// DESHABILITADO TEMPORALMENTE (ver DECISIONS.md): el registro con contraseña
// se fusionó con /login en el flujo simplificado (solo email + tipo de
// cuenta). El formulario original con contraseña sigue en el historial de
// git (`app/register/actions.ts` previo a este commit) por si se reactiva.
export default function RegisterPage() {
  redirect("/login");
}
