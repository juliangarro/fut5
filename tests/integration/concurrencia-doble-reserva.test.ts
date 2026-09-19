// Fase 2 de TESTING.md (P0, el test de mayor ROI del plan): automatiza la
// prueba manual ya hecha una vez en DECISIONS.md (dos inserts REST reales
// contra el mismo slot) para que un cambio futuro al trigger
// `retener_slot_al_crear_reserva` o al índice único parcial
// `reservas_slot_activa_unica` no pueda romper la garantía de "un slot, una
// reserva activa" sin que nadie lo note.
//
// No usa pgTAP (una sola transacción no puede probar concurrencia real
// entre dos sesiones) — usa dos conexiones `pg` separadas contra la base
// local de Supabase, cada una en su propia transacción, disparadas al mismo
// tiempo. Requiere `supabase start` corriendo (ver TESTING.md sección 0).
// @vitest-environment node

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Client } from "pg";
import { randomUUID } from "node:crypto";

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const futbolero1Id = randomUUID();
const futbolero2Id = randomUUID();
const adminId = randomUUID();
const canchaId = randomUUID();
const slotId = randomUUID();

const setup = new Client({ connectionString: DB_URL });

beforeAll(async () => {
  await setup.connect();
  await setup.query(`insert into auth.users (id, email) values ($1, $2), ($3, $4)`, [
    futbolero1Id,
    "concurrencia-futbolero1@example.com",
    futbolero2Id,
    "concurrencia-futbolero2@example.com",
  ]);
  // El rol se fija al crear (vía raw_user_meta_data -> handle_new_user), no
  // con un UPDATE después: usuarios_evitar_cambio_rol rechaza cualquier
  // cambio de rol incluso desde una conexión sin RLS.
  await setup.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, '{"rol":"admin_cancha"}'::jsonb)`,
    [adminId, "concurrencia-admin@example.com"]
  );
  await setup.query(
    `insert into canchas (id, admin_id, nombre, numero_sinpe) values ($1, $2, 'Cancha Concurrencia', '88880000')`,
    [canchaId, adminId]
  );
  await setup.query(
    `insert into slots (id, cancha_id, fecha, hora_inicio, hora_fin, precio, estado)
     values ($1, $2, current_date + 30, '18:00', '19:00', 10000, 'disponible')`,
    [slotId, canchaId]
  );
});

afterAll(async () => {
  // Orden por FKs: reservas -> slots -> canchas -> usuarios (cascade cubre
  // usuarios -> auth.users, pero se borra explícito para no depender de eso).
  await setup.query(`delete from reservas where slot_id = $1`, [slotId]);
  await setup.query(`delete from slots where id = $1`, [slotId]);
  await setup.query(`delete from canchas where id = $1`, [canchaId]);
  await setup.query(`delete from auth.users where id = any($1)`, [[futbolero1Id, futbolero2Id, adminId]]);
  await setup.end();
});

async function intentarReservar(futboleroId: string) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into reservas (id, futbolero_id, slot_id, monto) values ($1, $2, $3, 10000)`,
      [randomUUID(), futboleroId, slotId]
    );
    await client.query("commit");
    return { ok: true as const };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    return { ok: false as const, error: err as Error };
  } finally {
    await client.end();
  }
}

describe("concurrencia: doble reserva sobre el mismo slot", () => {
  test("de dos inserts simultáneos sobre el mismo slot, exactamente uno tiene éxito", async () => {
    const [r1, r2] = await Promise.all([
      intentarReservar(futbolero1Id),
      intentarReservar(futbolero2Id),
    ]);

    const exitosos = [r1, r2].filter((r) => r.ok);
    const fallidos = [r1, r2].filter((r) => !r.ok);

    expect(exitosos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);

    // El bloqueo de fila en retener_slot_al_crear_reserva (SELECT ... FOR
    // UPDATE) serializa a los dos: quien pierde la carrera ve el slot ya
    // 'retenido' y el trigger lo rechaza con un mensaje claro. El índice
    // único parcial reservas_slot_activa_unica es el respaldo si ese
    // bloqueo no alcanzara a serializar (ej. bajo otro nivel de aislamiento)
    // — se acepta también unique_violation (23505) como resultado válido.
    const errorFallido = (fallidos[0] as { ok: false; error: Error & { code?: string } }).error;
    const esRechazoDelTrigger = /no está disponible/.test(errorFallido.message);
    const esViolacionDeIndiceUnico = errorFallido.code === "23505";
    expect(esRechazoDelTrigger || esViolacionDeIndiceUnico).toBe(true);

    const { rows } = await setup.query<{ estado: string }>(`select estado from slots where id = $1`, [slotId]);
    expect(rows[0].estado).toBe("retenido");

    const { rows: reservasActivas } = await setup.query(
      `select count(*)::int as n from reservas where slot_id = $1 and estado in ('creada', 'pendiente_validacion', 'confirmada')`,
      [slotId]
    );
    expect(reservasActivas[0].n).toBe(1);
  });
});
