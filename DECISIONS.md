# Decision Records

Ver SPEC.md 10.7. Registro breve de decisiones no cubiertas explícitamente por
SPEC.md, para que el siguiente agente no tenga que re-descubrir el contexto.

## 2026-09-15 — Callback de invitación/reset de contraseña (`/auth/callback`)

El signup propio (`/register`) solo cubría email+password directo. Faltaba
manejar el flujo de invitación/magic-link/recuperación de Supabase: el link
del email redirige al Site URL del proyecto con `?code=...`, y sin una ruta
que llame a `exchangeCodeForSession` ese código nunca se canjea por sesión —
la app no tenía cómo terminar de loguear a alguien que llegaba por ese
camino. Se agregó `app/auth/callback/route.ts` (intercambia el código) y
`app/auth/set-password/` (formulario para fijar contraseña tras redimir la
invitación). Como esta app no manda magic links para login normal, cualquier
llegada a `/auth/callback` es invitación o reset — por eso el `next` default
es `/auth/set-password`, no el dashboard.

**Gap conocido, no resuelto todavía**: si un `AdminCancha` se invita desde el
dashboard de Supabase (Authentication → Invite user) en vez de por
`/register`, el trigger `handle_new_user` no recibe `raw_user_meta_data.rol`
y le asigna `futbolero` por default (ver migración `00000000000002`). Peor:
el trigger `evitar_cambio_de_rol` (migración `00000000000003`) bloquea
*cualquier* UPDATE que cambie `rol`, incluso desde el SQL Editor como
superusuario, porque el trigger no distingue quién hace el UPDATE. Para
corregir un rol mal asignado hay que desactivar el trigger a mano:
```sql
alter table usuarios disable trigger usuarios_evitar_cambio_rol;
update usuarios set rol = 'admin_cancha' where id = '<uuid>';
alter table usuarios enable trigger usuarios_evitar_cambio_rol;
```
La solución de fondo es no invitar `AdminCancha`s desde el dashboard de
Supabase — o construir un flujo de invitación propio que llame
`admin.inviteUserByEmail(email, { data: { rol, nombre } })` con el service
role para que el trigger reciba el rol correcto desde el arranque. No
implementado en este slice.

## 2026-09-15 — Cron de expiración: 1 vez/día en vez de cada 5 min (stopgap)

Vercel Hobby (plan actual del proyecto) limita los Cron Jobs a como máximo 1
ejecución por día — `*/5 * * * *` en `vercel.json` rompía el deploy. Se
cambió a `0 9 * * *` (9:00 UTC = 3:00am hora CR, hora de bajo tráfico) para
desbloquear el deploy.

**Esto es un stopgap, no la solución final.** Con cron diario, una `Reserva`
que queda en `pendiente_validacion` sin que el admin la resuelva no se libera
hasta la próxima corrida (hasta 24h), muy por encima de la ventana de
retención configurada (default 30 min, ver `configuracion` en la migración
`00000000000002`). Esto puede dejar un Slot retenido injustamente por horas.
Antes de operar con canchas reales, resolver con una de estas dos opciones
(discutidas con el humano a cargo, no decididas unilateralmente):
1. Disparar `GET /api/cron/expirar-reservas` cada 5 min desde un servicio
   externo gratuito (cron-job.org, GitHub Actions scheduled workflow) en vez
   de `vercel.json`.
2. Actualizar a Vercel Pro ($20/mes — ya presupuestado en SPEC.md 9) y
   volver a `*/5 * * * *`.

## 2026-09-15 — Setup inicial + slice vertical "reserva + validación de pago"

- **Nombres de tabla en español, snake_case**: `usuarios`, `canchas`,
  `slots`, `reservas`, `calificaciones` (no `ratings`, para consistencia de
  dominio en español — ver 10.5), `notificaciones`, `reglas_horario`,
  `configuracion`.
- **`usuarios` extiende `auth.users`** (id compartido, FK con `on delete
  cascade`) en vez de una tabla de auth propia — es el patrón estándar de
  Supabase. Se crea automáticamente vía trigger `handle_new_user` al hacer
  signup; el rol se pasa en `raw_user_meta_data.rol` desde el formulario de
  registro. No hay policy de INSERT directo sobre `usuarios` — solo el
  trigger (security definer) puede crear filas.
- **Prevención de auto-promoción de rol**: trigger `evitar_cambio_de_rol` en
  `usuarios` bloquea cualquier UPDATE que cambie `rol`. No hay flujo de
  cambio de rol en el MVP.
- **Slot.estado es derivado del estado de la Reserva activa**, sincronizado
  por trigger (`retener_slot_al_crear_reserva`, `sincronizar_estado_reserva`)
  en vez de que la aplicación lo escriba directamente. `bloqueado` es la
  única transición que un AdminCancha hace a mano (mantenimiento).
- **Concurrencia de doble reserva**: dos capas, no una. (1) El trigger
  `retener_slot_al_crear_reserva` hace `SELECT ... FOR UPDATE` sobre el slot
  antes de retenerlo — esto ya serializa reservas concurrentes sobre el mismo
  slot. (2) El índice único parcial `reservas_slot_activa_unica` es la
  garantía final a nivel de constraint, por si hay un bug en el trigger. Ver
  SPEC.md 10.2.
- **Funciones de trigger con `security definer`**: `retener_slot_al_crear_reserva`,
  `sincronizar_estado_reserva` y `recalcular_rating_cancha` necesitan escribir
  `slots`/`canchas` aunque el usuario que dispara el trigger (futbolero) no
  tenga UPDATE policy sobre esas tablas. Se documentó con `comment on
  function` en la migración para que quede explícito por qué.
- **Autorización de transición de estado de Reserva**: RLS garantiza límites
  de *propiedad* de fila (nadie toca reservas ajenas). Cuál transición es
  válida para cada rol (un futbolero no puede poner `estado=confirmada`; un
  admin no puede tocar una reserva que sigue en `creada`) se valida en las
  API routes de Next.js (`app/api/reservas/[id]/confirmar|rechazar`,
  `app/futbolero/reservas/[reservaId]/actions.ts`), no solo en RLS. Motivo:
  Postgres RLS no valida transiciones columna-por-columna de forma legible
  sin duplicar la máquina de estados en SQL.
- **Ventana de retención configurable** vía tabla `configuracion` (clave/valor)
  en vez de hardcodeada, default 30 min — leída por el trigger
  `sincronizar_estado_reserva`. Cambiarla es un UPDATE, no una migración.
- **Expiración de reservas vencidas**: función `expirar_reservas_vencidas()`
  invocada por `GET /api/cron/expirar-reservas`, protegida por
  `CRON_SECRET` y programada cada 5 min en `vercel.json` (Vercel Cron). No se
  asumió disponibilidad de `pg_cron` en todos los planes de Supabase.
- **Storage**: dos buckets — `fotos-cancha` (público) y `comprobantes`
  (privado). Convención de paths: primer segmento = `cancha_id` o
  `reserva_id` respectivamente; las policies de `storage.objects` resuelven
  propiedad a partir de ese segmento. Nunca se genera una URL pública para un
  comprobante — siempre `createSignedUrl` con expiración corta (300s), desde
  el server component de la cola de validación.
- **Consultas sin `select` anidado de PostgREST**: se usan múltiples queries
  encadenadas (`reservas` → `slots` → `canchas`, etc.) en vez de embeds tipo
  `slots(canchas(...))`. Motivo: `lib/types/database.ts` está escrito a mano
  y no define metadata de relaciones (`Relationships`), que es lo que
  supabase-js necesita para tipar bien un embed anidado. Más queries, pero
  tipado correcto sin generar el schema completo. **Reemplazar por
  `supabase gen types typescript`** apenas exista un proyecto Supabase real
  — en ese punto se puede volver a embeds anidados si conviene.
- **Realtime**: solo la tabla `reservas` está en la publicación
  `supabase_realtime` (ver migración `00000000000005`). El detalle de
  reserva del futbolero (`ReservaEstado.tsx`) se suscribe a
  `postgres_changes` filtrado por `id=eq.<reservaId>` — cumple 3.1.7 (ver
  estado en tiempo real). La cola de validación del admin usa
  `router.refresh()` tras confirmar/rechazar en vez de realtime — no hay
  requisito explícito de tiempo real ahí en el MVP.
- **Reglas de horario recurrentes** (SPEC.md 3.2.2, tabla `reglas_horario`):
  la tabla existe en el schema pero el generador automático de Slots hacia
  adelante **no está implementado en este slice** — el AdminCancha crea
  Slots individuales a mano (`/admin/canchas/[canchaId]/slots/nueva`). Es el
  siguiente slice vertical razonable a construir.
- **Auth**: solo email/password en este slice. OAuth social ("opcional" en
  SPEC.md 3.1.1) no implementado.
- **Cancelación de reserva por el futbolero**: solo mientras `estado =
  'creada'` (antes de subir comprobante). La cancelación post-confirmación
  según política de cancelación de la cancha (SPEC.md 3.1.11) queda fuera de
  este slice.
- **Compresión de imágenes en cliente** (`lib/comprimirImagen.ts`): canvas,
  máximo 1920px de lado mayor, JPEG calidad 0.85 — prioriza que el texto del
  comprobante SINPE siga siendo legible sobre minimizar peso agresivamente.
- **Sin tests automatizados todavía** en este slice — pendiente. La
  verificación de este slice fue manual (ver README.md, sección de
  verificación) porque no había forma de correr Supabase local (Docker no
  disponible en el entorno donde se escribió este código) ni un proyecto
  Supabase real conectado. **Esto es la advertencia más importante para el
  siguiente agente o para el humano a cargo: las migraciones SQL nunca se
  ejecutaron contra una base real. Revisarlas con cuidado antes de aplicarlas
  a producción.**
