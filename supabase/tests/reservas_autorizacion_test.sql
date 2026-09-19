-- Regresión del bug real cerrado en
-- 00000000000006_autorizar_transiciones_reserva.sql: antes de ese trigger,
-- un futbolero podía hacer `update reservas set estado = 'confirmada'` sobre
-- su propia reserva vía el cliente de Supabase, saltándose por completo la
-- validación manual del comprobante SINPE. RLS por sí sola no lo bloqueaba
-- porque solo valida propiedad de fila, no qué transición de estado es
-- válida. Ver TESTING.md sección 1 (P0) y sección 3, Fase 1.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(14);

-- Fixtures ------------------------------------------------------------
-- auth.users dispara handle_new_user (00000000000002), que crea la fila
-- de usuarios correspondiente automáticamente.

INSERT INTO auth.users (id, email)
VALUES ('a0000000-0000-0000-0000-000000000001', 'futbolero-test@example.com');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'admin-test@example.com',
  '{"rol":"admin_cancha"}'::jsonb
);

INSERT INTO auth.users (id, email)
VALUES ('a0000000-0000-0000-0000-000000000004', 'futbolero2-test@example.com');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'admin2-test@example.com',
  '{"rol":"admin_cancha"}'::jsonb
);

INSERT INTO canchas (id, admin_id, nombre, numero_sinpe) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Cancha Test', '88888888'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Cancha Ajena', '77777777');

-- El slot debe estar 'disponible' para que reservas_retener_slot
-- (00000000000002) lo acepte y lo pase a 'retenido' al insertar. Una fecha
-- distinta por slot evita colisiones con slots_unicidad sin tener que
-- variar la hora.
INSERT INTO slots (id, cancha_id, fecha, hora_inicio, hora_fin, precio, estado) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', current_date + 1, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', current_date + 2, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', current_date + 3, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', current_date + 4, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', current_date + 5, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', current_date + 6, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', current_date + 7, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', current_date + 8, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000002', current_date + 9, '18:00', '19:00', 10000, 'disponible');

-- reserva1: pendiente_validacion (comprobante subido), esperando que un
-- admin la confirme o rechace — el estado exacto que el bug explotaba.
INSERT INTO reservas (id, futbolero_id, slot_id, estado, monto, comprobante_url, comprobante_subido_at, expira_at)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'pendiente_validacion',
  10000,
  'https://example.com/comprobante.jpg',
  now(),
  now() + interval '30 minutes'
);

-- reserva2..reserva8: 'creada', para los casos que no dependen de estar en
-- pendiente_validacion.
INSERT INTO reservas (id, futbolero_id, slot_id, estado, monto) VALUES
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'creada', 10000),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'creada', 10000),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'creada', 10000),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'creada', 10000),
  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'creada', 10000);

-- reserva6: pendiente_validacion, para "no se puede cancelar desde acá".
INSERT INTO reservas (id, futbolero_id, slot_id, estado, monto, comprobante_url, comprobante_subido_at, expira_at)
VALUES (
  'd0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000006',
  'pendiente_validacion',
  10000,
  'https://example.com/comprobante.jpg',
  now(),
  now() + interval '30 minutes'
);

-- reserva7: confirmada directo (fixture, no vía flujo real), para
-- "no se puede cancelar desde acá" tampoco.
INSERT INTO reservas (id, futbolero_id, slot_id, estado, monto)
VALUES ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'confirmada', 10000);

-- reserva9: pendiente_validacion, pero en la cancha ajena (admin1 no es su
-- dueño) — para probar que un admin no puede tocar reservas de otra cancha.
INSERT INTO reservas (id, futbolero_id, slot_id, estado, monto, comprobante_url, comprobante_subido_at, expira_at)
VALUES (
  'd0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000009',
  'pendiente_validacion',
  10000,
  'https://example.com/comprobante.jpg',
  now(),
  now() + interval '30 minutes'
);

SET LOCAL ROLE authenticated;

-- Caso 1 (el bug real): el futbolero dueño de la reserva intenta
-- autoconfirmarse saltándose la validación del admin.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

SELECT throws_ok(
  $$ UPDATE reservas SET estado = 'confirmada' WHERE id = 'd0000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'Transición de estado no permitida',
  'un futbolero no puede autoconfirmar su propia reserva'
);

-- Caso 2: tampoco puede autorrechazarse.
SELECT throws_ok(
  $$ UPDATE reservas SET estado = 'rechazada' WHERE id = 'd0000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'Transición de estado no permitida',
  'un futbolero no puede autorrechazar su propia reserva'
);

-- Caso 5: no puede cambiar el monto de su reserva.
SELECT throws_ok(
  $$ UPDATE reservas SET monto = 1 WHERE id = 'd0000000-0000-0000-0000-000000000002' $$,
  'P0001',
  'No se puede modificar este campo de la reserva',
  'un futbolero no puede cambiar el monto de su reserva'
);

-- Caso 6: no puede cambiar el slot_id de su reserva.
SELECT throws_ok(
  $$ UPDATE reservas SET slot_id = 'c0000000-0000-0000-0000-000000000004' WHERE id = 'd0000000-0000-0000-0000-000000000003' $$,
  'P0001',
  'No se puede modificar este campo de la reserva',
  'un futbolero no puede cambiar el slot_id de su reserva'
);

-- Caso 7: no puede reasignar su reserva a otro futbolero.
SELECT throws_ok(
  $$ UPDATE reservas SET futbolero_id = 'a0000000-0000-0000-0000-000000000004' WHERE id = 'd0000000-0000-0000-0000-000000000004' $$,
  'P0001',
  'No se puede modificar este campo de la reserva',
  'un futbolero no puede reasignar su reserva a otro usuario'
);

-- Caso 8: sí puede cancelar desde 'creada'.
SELECT lives_ok(
  $$ UPDATE reservas SET estado = 'cancelada' WHERE id = 'd0000000-0000-0000-0000-000000000005' $$,
  'un futbolero sí puede cancelar su reserva desde creada'
);

SELECT is(
  (SELECT estado FROM reservas WHERE id = 'd0000000-0000-0000-0000-000000000005'),
  'cancelada'::estado_reserva,
  'la reserva cancelada desde creada queda en estado cancelada'
);

-- Caso 9: no puede cancelar desde pendiente_validacion.
SELECT throws_ok(
  $$ UPDATE reservas SET estado = 'cancelada' WHERE id = 'd0000000-0000-0000-0000-000000000006' $$,
  'P0001',
  'Transición de estado no permitida',
  'un futbolero no puede cancelar su reserva desde pendiente_validacion'
);

-- Caso 10: no puede cancelar desde confirmada.
SELECT throws_ok(
  $$ UPDATE reservas SET estado = 'cancelada' WHERE id = 'd0000000-0000-0000-0000-000000000007' $$,
  'P0001',
  'Transición de estado no permitida',
  'un futbolero no puede cancelar su reserva desde confirmada'
);

-- Caso 3: el admin de la cancha sí puede confirmar esa misma reserva —
-- prueba que el trigger no rompió el camino legítimo.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true
);

SELECT lives_ok(
  $$ UPDATE reservas SET estado = 'confirmada' WHERE id = 'd0000000-0000-0000-0000-000000000001' $$,
  'el admin de la cancha sí puede confirmar la reserva desde pendiente_validacion'
);

SELECT is(
  (SELECT estado FROM reservas WHERE id = 'd0000000-0000-0000-0000-000000000001'),
  'confirmada'::estado_reserva,
  'la reserva queda confirmada tras la aprobación del admin'
);

-- Caso 11: el admin no puede saltar creada -> confirmada directo.
SELECT throws_ok(
  $$ UPDATE reservas SET estado = 'confirmada' WHERE id = 'd0000000-0000-0000-0000-000000000008' $$,
  'P0001',
  'Transición de estado no permitida',
  'un admin no puede confirmar directo una reserva en creada'
);

-- Caso 12: un admin no puede tocar una reserva de una cancha ajena. RLS
-- (reservas_update_admin) filtra la fila antes de llegar al trigger, así
-- que el UPDATE no lanza excepción — simplemente no afecta ninguna fila.
SELECT lives_ok(
  $$ UPDATE reservas SET estado = 'confirmada' WHERE id = 'd0000000-0000-0000-0000-000000000009' $$,
  'el UPDATE sobre una reserva de cancha ajena no lanza excepción (RLS la filtra en silencio)'
);

-- Se relee como el futbolero dueño: admin1 no tiene policy de SELECT sobre
-- esta reserva (no es admin de esa cancha), así que su propia sesión no
-- serviría para verificar el resultado.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

SELECT is(
  (SELECT estado FROM reservas WHERE id = 'd0000000-0000-0000-0000-000000000009'),
  'pendiente_validacion'::estado_reserva,
  'la reserva de la cancha ajena queda sin cambios: RLS impidió que el UPDATE la alcanzara'
);

SELECT * FROM finish();
ROLLBACK;
