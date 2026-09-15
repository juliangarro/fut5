-- Esquema inicial: usuarios, canchas, slots, reservas, calificaciones, notificaciones.
-- Ver SPEC.md Sección 7 (Modelo de datos) y Sección 5.2 (máquina de estados de Reserva).

create extension if not exists "pgcrypto";
create extension if not exists postgis;

create type rol_usuario as enum ('futbolero', 'admin_cancha');
create type estado_slot as enum ('disponible', 'retenido', 'reservado', 'bloqueado');
create type estado_reserva as enum ('creada', 'pendiente_validacion', 'confirmada', 'rechazada', 'expirada', 'cancelada');
create type canal_notificacion as enum ('push', 'email');
create type estado_envio_notificacion as enum ('pendiente', 'enviada', 'fallida');

-- usuarios: extiende auth.users con datos de dominio. 1:1 vía id compartido.
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  rol rol_usuario not null default 'futbolero',
  nombre text not null,
  telefono text,
  email text not null unique,
  auth_provider text not null default 'email',
  created_at timestamptz not null default now()
);

create table canchas (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references usuarios (id) on delete cascade,
  nombre text not null,
  ubicacion geography(point, 4326),
  descripcion text,
  amenidades jsonb not null default '[]'::jsonb,
  fotos text[] not null default '{}',
  numero_sinpe text not null,
  politica_cancelacion text,
  rating_promedio numeric(3, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index canchas_admin_id_idx on canchas (admin_id);
create index canchas_ubicacion_idx on canchas using gist (ubicacion);

-- Reglas de horario recurrentes: generan Slots hacia adelante (Sección 3.2.2).
create table reglas_horario (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references canchas (id) on delete cascade,
  dias_semana int[] not null, -- 0=domingo .. 6=sábado
  hora_inicio time not null,
  hora_fin time not null,
  duracion_bloque_minutos int not null default 60,
  precio numeric(10, 2) not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  constraint reglas_horario_rango_valido check (hora_fin > hora_inicio)
);

create index reglas_horario_cancha_id_idx on reglas_horario (cancha_id);

create table slots (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references canchas (id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  precio numeric(10, 2) not null,
  estado estado_slot not null default 'disponible',
  regla_recurrente_id uuid references reglas_horario (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint slots_rango_valido check (hora_fin > hora_inicio),
  constraint slots_unicidad unique (cancha_id, fecha, hora_inicio)
);

create index slots_cancha_id_fecha_idx on slots (cancha_id, fecha);
create index slots_estado_idx on slots (estado);

create table reservas (
  id uuid primary key default gen_random_uuid(),
  futbolero_id uuid not null references usuarios (id) on delete cascade,
  slot_id uuid not null references slots (id) on delete restrict,
  estado estado_reserva not null default 'creada',
  comprobante_url text,
  monto numeric(10, 2) not null,
  motivo_rechazo text,
  creada_at timestamptz not null default now(),
  comprobante_subido_at timestamptz,
  expira_at timestamptz,
  resuelta_at timestamptz
);

create index reservas_futbolero_id_idx on reservas (futbolero_id);
create index reservas_slot_id_idx on reservas (slot_id);
create index reservas_estado_idx on reservas (estado);

-- Regla dura (Sección 5.2): un Slot solo puede tener una Reserva activa a la vez.
-- Índice único parcial sobre slot_id mientras estado in (creada, pendiente_validacion, confirmada).
-- Esto es lo que previene doble reserva bajo concurrencia, no la lógica de aplicación (ver 10.2).
create unique index reservas_slot_activa_unica
  on reservas (slot_id)
  where estado in ('creada', 'pendiente_validacion', 'confirmada');

create table calificaciones (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references canchas (id) on delete cascade,
  futbolero_id uuid not null references usuarios (id) on delete cascade,
  reserva_id uuid not null references reservas (id) on delete cascade,
  puntaje int not null check (puntaje between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  constraint calificaciones_reserva_unica unique (reserva_id)
);

create index calificaciones_cancha_id_idx on calificaciones (cancha_id);

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references usuarios (id) on delete cascade,
  tipo text not null,
  canal canal_notificacion not null,
  estado_envio estado_envio_notificacion not null default 'pendiente',
  created_at timestamptz not null default now()
);

create index notificaciones_user_id_idx on notificaciones (user_id);
