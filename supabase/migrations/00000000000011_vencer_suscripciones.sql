-- Vencimiento automático de suscripciones y add-ons — mismo patrón que
-- expirar_reservas_vencidas (00000000000002): función autocontenida,
-- invocada por un cron externo (Vercel Cron -> app/api/cron/
-- vencer-suscripciones/route.ts), no se asume pg_cron disponible.
--
-- Solo mueve hacia adelante (activa -> en_gracia -> vencida para
-- suscripciones; activo -> vencido para add-ons), nunca hacia atrás.
-- Reactivar por pago confirmado sigue siendo manual en v1 — ver
-- plan-monetizacion-admin.md sección 6.3.
create function vencer_suscripciones_y_addons()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gracia_dias int;
begin
  select coalesce((select valor::int from configuracion where clave = 'suscripcion_gracia_dias'), 7)
    into gracia_dias;

  update suscripciones
  set estado = 'en_gracia', gracia_hasta = current_date + gracia_dias
  where estado = 'activa' and periodo_actual_fin < current_date;

  update suscripciones
  set estado = 'vencida'
  where estado = 'en_gracia' and gracia_hasta < current_date;

  update addons_suscripcion
  set estado = 'vencido'
  where estado = 'activo' and periodo_actual_fin < current_date;
end;
$$;

comment on function vencer_suscripciones_y_addons is
  'security definer: ni suscripciones ni addons_suscripcion tienen policy de update '
  '(solo ops escribe, vía service role) — esta función es la única vía para vencer '
  'automáticamente, aunque en la práctica el cron ya llama vía service role.';
