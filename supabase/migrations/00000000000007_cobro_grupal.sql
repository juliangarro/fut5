-- Link de cobro grupal (ver handoff spec en la sesión de diseño): un
-- futbolero que reserva puede generar un link público para que sus amigos
-- paguen su parte del monto sin necesitar cuenta. Cada aporte se valida
-- individualmente por el admin de la cancha; la reserva se confirma sola
-- (creada -> confirmada, sin pasar por pendiente_validacion) cuando la suma
-- de aportes confirmados cubre el monto total.
--
-- Decisión de diseño: no se reutiliza reservas.comprobante_url para esto.
-- El trigger sincronizar_estado_reserva (00000000000002) y
-- autorizar_transicion_reserva (00000000000006) ya asumen "un comprobante =
-- la reserva". Meter N comprobantes ahí rompería ambos. `aportes` es una
-- tabla nueva y separada a propósito.

alter table reservas
  add column modo_cobro text not null default 'individual'
    check (modo_cobro in ('individual', 'grupal')),
  add column token_cobro uuid unique,
  add column cantidad_aportes int
    check (cantidad_aportes is null or cantidad_aportes between 2 and 30);

create table aportes (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references reservas(id),
  nombre text not null check (char_length(nombre) between 1 and 60),
  telefono text,
  monto int not null check (monto > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'comprobante_subido', 'confirmado', 'rechazado')),
  motivo_rechazo text,
  comprobante_url text,
  comprobante_subido_at timestamptz,
  resuelto_at timestamptz,
  created_at timestamptz not null default now()
);

create index aportes_reserva_idx on aportes (reserva_id);
create index aportes_estado_idx on aportes (estado);

-- RLS: solo lectura por policy (organizador dueño de la reserva, o admin de
-- esa cancha — mismo patrón que storage.comprobantes_select_dueno). No hay
-- policy de insert/update/delete a propósito: el amigo que aporta no tiene
-- auth.uid() (no tiene cuenta), y el admin confirma/rechaza vía Route
-- Handler. Todas las escrituras pasan por createServiceRoleClient(), que
-- bypasea RLS igual que el cron de expiración (ver lib/supabase/service-role.ts)
-- — la validación de "quién puede hacer qué" vive en esos Route Handlers,
-- no acá, porque el actor real (un desconocido con un link) no es
-- representable como un rol de Postgres.
alter table aportes enable row level security;

create policy aportes_select_organizador_o_admin on aportes
  for select using (
    exists (
      select 1 from reservas r
      join slots s on s.id = r.slot_id
      where r.id = aportes.reserva_id
        and (r.futbolero_id = auth.uid() or es_admin_de_slot(s.id))
    )
  );

-- Cuando un aporte pasa a 'confirmado', revisa si ya se cubrió el monto
-- total de la reserva y, si es así, confirma la reserva directamente
-- (salta pendiente_validacion: cada aporte ya fue validado individualmente
-- por el admin, no hace falta una segunda revisión consolidada).
create function confirmar_reserva_si_aportes_completos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva reservas%rowtype;
  v_total_confirmado int;
begin
  if new.estado <> 'confirmado' or old.estado = 'confirmado' then
    return new;
  end if;

  select * into v_reserva from reservas where id = new.reserva_id;

  if v_reserva.estado <> 'creada' then
    return new;
  end if;

  select coalesce(sum(monto), 0) into v_total_confirmado
  from aportes
  where reserva_id = new.reserva_id and estado = 'confirmado';

  if v_total_confirmado >= v_reserva.monto then
    update reservas set estado = 'confirmada' where id = new.reserva_id;
  end if;

  return new;
end;
$$;

create trigger aportes_confirmar_reserva
  after update on aportes
  for each row execute function confirmar_reserva_si_aportes_completos();

-- El organizador ve la lista de aportes en vivo (CobroGrupal.tsx se
-- suscribe a postgres_changes) — mismo patrón que reservas en
-- 00000000000005_realtime.sql. Respeta la policy de select de arriba.
alter publication supabase_realtime add table aportes;

comment on function confirmar_reserva_si_aportes_completos is
  'security definer: el admin que confirma un aporte no tiene UPDATE policy '
  'sobre reservas fuera de la transición pendiente_validacion->confirmada '
  '(ver autorizar_transicion_reserva) — este trigger es la única vía para '
  'que un aporte confirmado cierre una reserva en modo_cobro=grupal.';

-- Reusa el bucket "comprobantes" ya existente (privado). Convención de path
-- nueva: comprobantes/{reserva_id}/aportes/{aporte_id}/{archivo} — el primer
-- segmento se mantiene como reserva_id a propósito, para no romper
-- comprobantes_select_dueno (00000000000004_storage.sql), que castea ese
-- segmento a uuid y resuelve propiedad (futbolero dueño o admin de la
-- cancha) contra `reservas`. Eso deja la firma de URL para el admin
-- funcionando con su sesión normal, sin policy nueva.
-- La escritura (subida del amigo) sí pasa por createServiceRoleClient() —
-- el amigo no tiene sesión, no puede pegarle directo a Storage — así que
-- comprobantes_insert_dueno no aplica ahí, pero tampoco hace falta: el
-- service role bypasea RLS igual que en el resto de este archivo.
