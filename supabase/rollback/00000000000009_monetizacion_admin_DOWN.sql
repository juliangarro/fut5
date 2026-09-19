-- Reversión COMPLETA del modelo de suscripción/add-ons de monetización
-- (00000000000009 + 00000000000010 + 00000000000011). Mismo patrón que
-- supabase/rollback/00000000000007_cobro_grupal_DOWN.sql: esto NO es una
-- migración, vive fuera de supabase/migrations/ a propósito para que
-- `supabase db push` nunca la corra por accidente. Script manual, para
-- pegar en el SQL Editor, solo para el día que se decida sacar la feature
-- del todo (no para un apagado temporal — para eso está
-- `monetizacion_habilitada` en `configuracion`: un UPDATE, sin borrar
-- nada).
--
-- ORDEN RECOMENDADO antes de correr esto:
--   1. Apagar el flag (UPDATE configuracion SET valor = 'false' WHERE
--      clave = 'monetizacion_habilitada';) y confirmar con el negocio que
--      no hay ningún AdminCancha pagando activamente en este momento.
--   2. Confirmar que no te importa perder el historial de quién tenía
--      qué tier y qué add-ons (`suscripciones`, `addons_suscripcion`) —
--      este script lo borra sin backup. Si te importa conservarlo,
--      exportá ambas tablas antes (Table Editor -> Export a CSV).

begin;

drop function if exists vencer_suscripciones_y_addons();

drop table if exists addons_suscripcion;
drop table if exists suscripciones;

delete from configuracion where clave in (
  'monetizacion_habilitada',
  'suscripcion_gracia_dias',
  'destacados_max_por_busqueda'
);

commit;

-- Después de correr esto, borrá también del código (no lo hace este script):
--   - app/api/cron/vencer-suscripciones/
--   - lib/suscripciones.ts
--   - los tipos TierSuscripcion/EstadoSuscripcion/AddonSuscripcion/EstadoAddon
--     y las tablas suscripciones/addons_suscripcion en lib/types/database.ts
--   - la entrada de /api/cron/vencer-suscripciones en vercel.json
--   - cualquier gating de nivelDeAcceso/tieneDestacado/tieneModeracionReportes
--     que se haya agregado en UI para ese momento (dashboard de insights,
--     ListaCanchas.tsx, botón de reportar comentario)
