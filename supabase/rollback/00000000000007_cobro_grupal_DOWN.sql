-- Reversión COMPLETA del cobro grupal (00000000000007 + 00000000000008).
-- Esto NO es una migración — vive fuera de supabase/migrations/ a propósito
-- para que `supabase db push` nunca la corra por accidente. Es un script
-- manual, para pegar en el SQL Editor, solo para el día que se decida sacar
-- la feature del todo (no para un apagado temporal — para eso está el flag,
-- ver 00000000000008_flag_cobro_grupal.sql: un UPDATE, sin borrar nada).
--
-- ORDEN RECOMENDADO antes de correr esto:
--   1. Apagar el flag (UPDATE configuracion SET valor = 'false' WHERE
--      clave = 'cobro_grupal_habilitado';) y esperar a que no queden
--      reservas con modo_cobro = 'grupal' y estado = 'creada' (o sea: nadie
--      con un link de cobro activo cobrando en este momento).
--   2. Confirmar que no te importa perder el historial de `aportes`
--      (quién pagó qué, comprobantes) — este script lo borra sin backup.
--      Si te importa conservarlo, exportá la tabla antes (Table Editor ->
--      aportes -> Export a CSV) o comentá el DROP TABLE de abajo y dejala
--      huérfana en vez de borrarla.
--   3. Los archivos ya subidos al bucket "comprobantes" bajo
--      {reserva_id}/aportes/... NO se borran automáticamente por este
--      script (Storage no es transaccional con Postgres) — hazlo aparte
--      desde el dashboard de Storage si hace falta liberar espacio.

begin;

drop trigger if exists aportes_confirmar_reserva on aportes;
drop function if exists confirmar_reserva_si_aportes_completos();

alter publication supabase_realtime drop table aportes;

drop table if exists aportes;

alter table reservas
  drop column if exists modo_cobro,
  drop column if exists token_cobro,
  drop column if exists cantidad_aportes;

delete from configuracion where clave = 'cobro_grupal_habilitado';

commit;

-- Después de correr esto, borrá también del código (no lo hace este script):
--   - app/api/reservas/[id]/link-cobro/
--   - app/api/pago/
--   - app/api/aportes/
--   - app/pago/
--   - components/futbolero/CobroGrupal.tsx
--   - components/pago/
--   - components/ColaAportes.tsx
--   - lib/featureFlags.ts
--   - el bloque de CobroGrupal en components/ReservaEstado.tsx (y sus props)
--   - el bloque de aportes en app/futbolero/reservas/[reservaId]/page.tsx
--   - el bloque de ColaAportes en app/admin/validaciones/page.tsx
--   - los tipos ModoCobro/EstadoAporte/aportes/configuracion en lib/types/database.ts
