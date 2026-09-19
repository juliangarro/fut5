-- Kill switch para el cobro grupal (00000000000007). Mismo patrón que
-- 'ventana_retencion_minutos' (00000000000002): una fila en `configuracion`,
-- sin UI de admin — se cambia a mano en el SQL Editor de Supabase.
--
-- Apagarlo (UPDATE configuracion SET valor = 'false' WHERE clave =
-- 'cobro_grupal_habilitado';) NO rompe nada en curso: los links ya
-- generados siguen aceptando pagos y confirmándose solos (ver
-- app/api/pago/[token]/... y el trigger aportes_confirmar_reserva). Solo
-- bloquea que un organizador ARRANQUE un cobro grupal nuevo — se oculta el
-- botón "Cobrar entre amigos" en la UI (lib/featureFlags.ts) y
-- /api/reservas/[id]/link-cobro lo rechaza igual como defensa en profundidad
-- por si la UI vieja quedó cacheada en el teléfono de alguien.
--
-- No hace falta ninguna migración para "apagar" la feature — es a propósito
-- para no necesitar un deploy ni tocar el schema. Ver
-- supabase/rollback/00000000000007_cobro_grupal_DOWN.sql si en algún
-- momento se decide sacar el feature del todo (eso sí borra datos).
insert into configuracion (clave, valor) values ('cobro_grupal_habilitado', 'true')
on conflict (clave) do nothing;
