-- Suscripción SaaS por cuenta AdminCancha (no por cancha individual) — ver
-- plan-monetizacion-admin.md sección 6.1/6.0. Cuadra con "descuento por
-- volumen a partir de 2+ canchas" (sección 1): la unidad de facturación es
-- la cuenta admin, no cada cancha que administra.
--
-- Sin fila para un admin_id = tier gratis. Mismo patrón de "ausencia =
-- default" que `configuracion` (00000000000002) y el flag de
-- 00000000000008: el helper de gating (lib/suscripciones.ts) trata "no
-- encontrado" como gratis, sin necesidad de un valor explícito 'gratis'.
--
-- No hay tabla de pagos/facturas todavía: el cobro sigue siendo SINPE
-- manual fuera de la app (sección 1). Ops actualiza `periodo_actual_fin`/
-- `estado` a mano en el SQL Editor de Supabase al confirmar el pago
-- mensual — no hay flujo de reactivación in-app en v1.
create table suscripciones (
  admin_id uuid primary key references usuarios (id) on delete cascade,
  tier text not null check (tier in ('pro', 'pro_plus')),
  estado text not null default 'activa'
    check (estado in ('activa', 'en_gracia', 'vencida')),
  periodo_actual_fin date not null,
  gracia_hasta date,
  notas text,
  created_at timestamptz not null default now()
);

comment on column suscripciones.notas is
  'Referencia libre del comprobante SINPE del mes, anotada a mano por ops — no hay tabla de pagos en v1.';

insert into configuracion (clave, valor) values
  ('monetizacion_habilitada', 'true'),
  ('suscripcion_gracia_dias', '7')
on conflict (clave) do nothing;

alter table suscripciones enable row level security;

-- Solo SELECT por policy, para que el AdminCancha vea su propio estado en
-- el dashboard. Sin policy de insert/update/delete a propósito: solo ops
-- escribe esta tabla, vía createServiceRoleClient() (mismo patrón que
-- `aportes`, 00000000000007) — no hay flujo de autoservicio de
-- facturación en v1.
create policy suscripciones_select_propia on suscripciones
  for select using (admin_id = auth.uid());
