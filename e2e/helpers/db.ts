import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Seguro duro: nunca sembrar/limpiar datos de E2E contra el único proyecto
// Supabase real (ver TESTING.md sección 0 — no hay staging). Si esta URL no
// es local, aborta antes de escribir nada. playwright.config.ts ya fuerza
// esto vía `webServer.env`, pero este archivo también corre datos hacia el
// bucket de comprobantes/consultas de limpieza directamente con el service
// role, así que se verifica acá también, por las dudas de que algo invoque
// este helper fuera de ese webServer.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(SUPABASE_URL)) {
  throw new Error(
    `Seguro de E2E: NEXT_PUBLIC_SUPABASE_URL ("${SUPABASE_URL}") no apunta a un Supabase local. ` +
      `Los tests E2E nunca deben correr contra producción (ver TESTING.md sección 0). Abortando.`
  );
}

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function crearUsuario(email: string, rol: "futbolero" | "admin_cancha") {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { rol },
  });
  if (error || !data.user) throw error ?? new Error(`No se pudo crear el usuario ${email}`);
  return data.user.id;
}

export type CanchaSembrada = {
  adminId: string;
  adminEmail: string;
  canchaId: string;
  slotId: string;
  nombreCancha: string;
};

/** Cancha con un admin dueño y un slot 'disponible' a futuro, listos para el camino dorado del futbolero. */
export async function sembrarCanchaConSlot(): Promise<CanchaSembrada> {
  const sufijo = randomUUID().slice(0, 8);
  const nombreCancha = `Cancha E2E ${sufijo}`;
  const adminEmail = `e2e-admin-${sufijo}@example.com`;
  const adminId = await crearUsuario(adminEmail, "admin_cancha");

  const canchaId = randomUUID();
  const { error: errorCancha } = await admin
    .from("canchas")
    .insert({ id: canchaId, admin_id: adminId, nombre: nombreCancha, numero_sinpe: "88880000" });
  if (errorCancha) throw errorCancha;

  const slotId = randomUUID();
  const { error: errorSlot } = await admin.from("slots").insert({
    id: slotId,
    cancha_id: canchaId,
    // Mañana, no cualquier fecha futura: el SlotPicker muestra un tab por
    // día con etiquetas "Hoy"/"Mañana"/nombre corto — "Mañana" es la única
    // predecible sin importar en qué día de la semana corra el test.
    fecha: fechaEnDias(1),
    hora_inicio: "18:00",
    hora_fin: "19:00",
    precio: 10000,
    estado: "disponible",
  });
  if (errorSlot) throw errorSlot;

  return { adminId, adminEmail, canchaId, slotId, nombreCancha };
}

/** Igual que arriba, pero además crea un futbolero con una reserva ya en pendiente_validacion sobre ese slot. */
export async function sembrarReservaPendiente() {
  const cancha = await sembrarCanchaConSlot();
  const sufijo = randomUUID().slice(0, 8);
  const futboleroEmail = `e2e-futbolero-${sufijo}@example.com`;
  const futboleroId = await crearUsuario(futboleroEmail, "futbolero");

  const reservaId = randomUUID();
  const { error: errorReserva } = await admin.from("reservas").insert({
    id: reservaId,
    futbolero_id: futboleroId,
    slot_id: cancha.slotId,
    estado: "pendiente_validacion",
    monto: 10000,
    comprobante_url: `${reservaId}/comprobante.jpg`,
    comprobante_subido_at: new Date().toISOString(),
    expira_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  });
  if (errorReserva) throw errorReserva;
  await admin.from("slots").update({ estado: "retenido" }).eq("id", cancha.slotId);

  return { ...cancha, futboleroId, futboleroEmail, reservaId };
}

function fechaEnDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Borra en cascada (reservas -> slots vía cancha, usuarios vía auth.users) todo lo sembrado por un test. */
export async function limpiar(ids: { canchaId?: string; adminId?: string; futboleroId?: string }) {
  if (ids.canchaId) await admin.from("canchas").delete().eq("id", ids.canchaId);
  if (ids.adminId) await admin.auth.admin.deleteUser(ids.adminId).catch(() => {});
  if (ids.futboleroId) await admin.auth.admin.deleteUser(ids.futboleroId).catch(() => {});
}
