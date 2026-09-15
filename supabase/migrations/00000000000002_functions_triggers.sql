-- Funciones y triggers que mantienen la máquina de estados de Reserva/Slot
-- consistente a nivel de base de datos (ver SPEC.md 5.2 y 10.2 — la integridad
-- transaccional no puede depender solo de la lógica de aplicación).

create table configuracion (
  clave text primary key,
  valor text not null
);

insert into configuracion (clave, valor) values ('ventana_retencion_minutos', '30');

-- 1) Crear automáticamente la fila de `usuarios` al registrarse en Supabase Auth.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, rol, nombre, email, auth_provider)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'rol')::rol_usuario, 'futbolero'),
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2) Al crear una Reserva, retener el Slot. Si el Slot no está disponible
--    (bloqueado, o ya retenido por otra reserva activa) se aborta la transacción.
--    El índice único parcial `reservas_slot_activa_unica` es la garantía final
--    contra doble reserva concurrente; este trigger da además un mensaje claro.
create function retener_slot_al_crear_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  slot_actual estado_slot;
begin
  select estado into slot_actual from slots where id = new.slot_id for update;

  if slot_actual is null then
    raise exception 'El slot % no existe', new.slot_id;
  end if;

  if slot_actual <> 'disponible' then
    raise exception 'El slot % no está disponible (estado actual: %)', new.slot_id, slot_actual
      using errcode = 'check_violation';
  end if;

  update slots set estado = 'retenido' where id = new.slot_id;
  return new;
end;
$$;

create trigger reservas_retener_slot
  before insert on reservas
  for each row execute function retener_slot_al_crear_reserva();

comment on function retener_slot_al_crear_reserva is
  'security definer: el futbolero que inserta la reserva no tiene UPDATE policy sobre slots '
  '(solo el admin de la cancha la tiene) — esta función necesita escribir slots.estado igual.';

-- 3) Al subir el Comprobante, mover creada -> pendiente_validacion y calcular
--    expira_at según la ventana de retención configurada (default 30 min).
--    Al resolver la reserva (confirmada/rechazada/expirada/cancelada), marcar
--    resuelta_at y sincronizar el estado del Slot.
create function sincronizar_estado_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ventana_minutos int;
begin
  if new.comprobante_url is not null and old.comprobante_url is null then
    select valor::int into ventana_minutos from configuracion where clave = 'ventana_retencion_minutos';
    new.comprobante_subido_at := now();
    new.estado := 'pendiente_validacion';
    new.expira_at := now() + (coalesce(ventana_minutos, 30) || ' minutes')::interval;
  end if;

  if new.estado in ('confirmada', 'rechazada', 'expirada', 'cancelada') and old.resuelta_at is null then
    new.resuelta_at := now();
  end if;

  if new.estado <> old.estado then
    if new.estado = 'confirmada' then
      update slots set estado = 'reservado' where id = new.slot_id;
    elsif new.estado in ('rechazada', 'expirada', 'cancelada') then
      update slots set estado = 'disponible' where id = new.slot_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger reservas_sincronizar_estado
  before update on reservas
  for each row execute function sincronizar_estado_reserva();

comment on function sincronizar_estado_reserva is
  'security definer: ni el futbolero (sube comprobante) ni el admin (confirma/rechaza) '
  'tienen UPDATE policy sobre slots — esta función necesita escribir slots.estado igual.';

-- 4) Expirar reservas `pendiente_validacion` cuya ventana de retención venció.
--    Invocar periódicamente (pg_cron si está disponible, o un cron externo
--    -Vercel Cron- que llame a una API route con el service role). No se asume
--    disponibilidad de pg_cron en todos los planes, por eso esta función es
--    autocontenida y segura de invocar desde afuera.
create function expirar_reservas_vencidas()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reservas
  set estado = 'expirada'
  where estado = 'pendiente_validacion'
    and expira_at < now();
end;
$$;

-- 5) Recalcular canchas.rating_promedio cuando cambian las calificaciones,
--    en vez de promediarlo en cada lectura (ver 10.8, rendimiento y costos).
create function recalcular_rating_cancha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cancha_afectada uuid;
begin
  cancha_afectada := coalesce(new.cancha_id, old.cancha_id);

  update canchas
  set rating_promedio = coalesce(
    (select round(avg(puntaje)::numeric, 2) from calificaciones where cancha_id = cancha_afectada),
    0
  )
  where id = cancha_afectada;

  return null;
end;
$$;

create trigger calificaciones_recalcular_rating
  after insert or update or delete on calificaciones
  for each row execute function recalcular_rating_cancha();
