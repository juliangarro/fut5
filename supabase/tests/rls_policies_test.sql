-- Cobertura de RLS/gaps de autorización listados en TESTING.md sección 1
-- (P0) y sección 3, Fase 1, que no dependen del trigger de transición de
-- estado (ver reservas_autorizacion_test.sql para eso): cambio de rol,
-- lectura de reservas ajenas, helpers es_admin_de_*, y las dos policies de
-- storage sobre comprobantes.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(10);

-- Fixtures ------------------------------------------------------------
INSERT INTO auth.users (id, email)
VALUES ('a0000000-0000-0000-0000-000000000001', 'futbolero-test@example.com');

INSERT INTO auth.users (id, email)
VALUES ('a0000000-0000-0000-0000-000000000004', 'futbolero2-test@example.com');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'admin-test@example.com',
  '{"rol":"admin_cancha"}'::jsonb
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'admin2-test@example.com',
  '{"rol":"admin_cancha"}'::jsonb
);

INSERT INTO canchas (id, admin_id, nombre, numero_sinpe) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Cancha Test', '88888888'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Cancha Ajena', '77777777');

INSERT INTO slots (id, cancha_id, fecha, hora_inicio, hora_fin, precio, estado) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', current_date + 1, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', current_date + 2, '18:00', '19:00', 10000, 'disponible'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', current_date + 3, '18:00', '19:00', 10000, 'disponible');

-- reserva1: pendiente_validacion — para "no leer reservas ajenas" y para el
-- comprobante de las pruebas de storage select.
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

-- reserva2: 'creada' — para poder subir un comprobante nuevo (insert policy
-- exige estado = 'creada').
INSERT INTO reservas (id, futbolero_id, slot_id, estado, monto)
VALUES ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'creada', 10000);

-- Objeto de storage ya existente para reserva1 (subido "a mano" como
-- postgres, con RLS bypasseada, simulando lo que dejó una subida real).
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('comprobantes', 'd0000000-0000-0000-0000-000000000001/comprobante.jpg', 'a0000000-0000-0000-0000-000000000001');

SET LOCAL ROLE authenticated;

-- Caso: el trigger usuarios_evitar_cambio_rol (00000000000003) rechaza que
-- un usuario se autopromueva.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

SELECT throws_ok(
  $$ UPDATE usuarios SET rol = 'admin_cancha' WHERE id = 'a0000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'No se puede cambiar el rol de un usuario existente',
  'un usuario no puede autopromoverse de futbolero a admin_cancha'
);

-- Caso: reservas_select_propia_o_admin — un futbolero no relacionado no ve
-- una reserva ajena (no lanza excepción, simplemente no la retorna).
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text,
  true
);

SELECT is(
  (SELECT count(*) FROM reservas WHERE id = 'd0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'un futbolero no puede leer una reserva ajena'
);

-- Caso: es_admin_de_cancha / es_admin_de_slot devuelven false para un admin
-- que no es dueño de esa cancha.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true
);

SELECT is(
  es_admin_de_cancha('b0000000-0000-0000-0000-000000000002'::uuid),
  false,
  'es_admin_de_cancha es false para un admin que no es dueño de esa cancha'
);

SELECT is(
  es_admin_de_slot('c0000000-0000-0000-0000-000000000003'::uuid),
  false,
  'es_admin_de_slot es false para un slot de una cancha ajena'
);

-- Storage: comprobantes_select_dueno --------------------------------------
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

SELECT is(
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'comprobantes' AND name = 'd0000000-0000-0000-0000-000000000001/comprobante.jpg'),
  1::bigint,
  'el futbolero dueño de la reserva sí ve su propio comprobante'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true
);

SELECT is(
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'comprobantes' AND name = 'd0000000-0000-0000-0000-000000000001/comprobante.jpg'),
  1::bigint,
  'el admin de la cancha sí ve el comprobante de una reserva de su cancha'
);

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text,
  true
);

SELECT is(
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'comprobantes' AND name = 'd0000000-0000-0000-0000-000000000001/comprobante.jpg'),
  0::bigint,
  'un futbolero ajeno a la reserva no puede leer su comprobante'
);

-- Storage: comprobantes_insert_dueno --------------------------------------
-- futbolero1 es dueño de reserva2 y está en 'creada' -> insert permitido.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

SELECT lives_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('comprobantes', 'd0000000-0000-0000-0000-000000000002/comprobante.jpg', 'a0000000-0000-0000-0000-000000000001') $$,
  'el futbolero dueño de una reserva en creada sí puede subir su comprobante'
);

-- futbolero2 no es dueño de reserva2 -> insert rechazado por RLS.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text,
  true
);

SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('comprobantes', 'd0000000-0000-0000-0000-000000000002/otro-ajeno.jpg', 'a0000000-0000-0000-0000-000000000004') $$,
  '42501',
  null,
  'un futbolero no puede subir un comprobante a la reserva de otro'
);

-- futbolero1 es dueño de reserva1, pero ya no está en 'creada'
-- (pendiente_validacion) -> insert rechazado por RLS.
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

SELECT throws_ok(
  $$ INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('comprobantes', 'd0000000-0000-0000-0000-000000000001/otro.jpg', 'a0000000-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'un futbolero no puede subir un comprobante a una reserva que ya no está en creada'
);

SELECT * FROM finish();
ROLLBACK;
