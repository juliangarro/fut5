-- Add-ons de monetización, separados de `suscripciones` (00000000000009) a
-- propósito: un AdminCancha del tier gratis puede comprar "Destacado" sin
-- pasar por Pro (plan-monetizacion-admin.md sección 6.0/6.1). `destacado`
-- se activa por cancha (una cancha específica se posiciona en el listado
-- de búsqueda del Futbolero); `moderacion_reportes` se activa por cuenta
-- (habilita el botón de reportar un comentario a un moderador humano —
-- sección 4.2 del plan; el filtro automático de lenguaje ofensivo NO pasa
-- por este check, aplica a todos los AdminCancha por igual).
create table addons_suscripcion (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references usuarios (id) on delete cascade,
  addon text not null check (addon in ('destacado', 'moderacion_reportes')),
  cancha_id uuid references canchas (id) on delete cascade,
  estado text not null default 'activo' check (estado in ('activo', 'vencido')),
  periodo_actual_fin date not null,
  created_at timestamptz not null default now(),
  constraint addons_destacado_requiere_cancha check (
    (addon = 'destacado' and cancha_id is not null) or
    (addon = 'moderacion_reportes' and cancha_id is null)
  )
);

-- Un admin no puede tener dos filas activas del mismo add-on para la misma
-- cancha (o, para 'moderacion_reportes', dos filas para la misma cuenta) —
-- coalesce contra un uuid fijo porque un índice único trata cada NULL como
-- distinto de cualquier otro NULL.
create unique index addons_suscripcion_unico
  on addons_suscripcion (admin_id, addon, coalesce(cancha_id, '00000000-0000-0000-0000-000000000000'));

create index addons_suscripcion_admin_idx on addons_suscripcion (admin_id);
create index addons_suscripcion_cancha_idx on addons_suscripcion (cancha_id) where cancha_id is not null;

insert into configuracion (clave, valor) values
  ('destacados_max_por_busqueda', '2')
on conflict (clave) do nothing;

alter table addons_suscripcion enable row level security;

create policy addons_suscripcion_select_propia on addons_suscripcion
  for select using (admin_id = auth.uid());

-- 'destacado' activo es información pública en la práctica (se muestra
-- como "Patrocinado" en el listado) — el listado de búsqueda del
-- Futbolero (app/futbolero/canchas/page.tsx) necesita poder leer qué
-- canchas están destacadas sin ser su admin. `moderacion_reportes` no
-- necesita esta policy: es una capacidad interna del AdminCancha, nadie
-- más la consulta.
create policy addons_suscripcion_select_publico_destacado on addons_suscripcion
  for select using (addon = 'destacado' and estado = 'activo');

-- Sin policy de insert/update/delete, mismo motivo que suscripciones: solo
-- ops escribe, vía service role.
