# Decision Records

Ver SPEC.md 10.7. Registro breve de decisiones no cubiertas explícitamente por
SPEC.md, para que el siguiente agente no tenga que re-descubrir el contexto.

## 2026-09-15 — Dashboard de insights (`/admin/insights`)

Implementa SPEC.md 3.3 (métricas mínimas) + plan-ui-ux-canchas-fut5-cr.md 6.5,
gratis para todos los AdminCancha por ahora — ver plan-monetizacion-admin.md
sección 3: no gatear nada hasta validar que se usa.

- **Cargada la skill `dataviz`** antes de construir los charts, como pide el
  propio doc de UI/UX. Ningún chart de esta pantalla necesitó paleta
  categórica (8 hues + validador): el heatmap es secuencial (un solo hue,
  claro→oscuro por magnitud — pasos de opacidad sobre `--primary`), el
  gráfico de ingresos es una sola serie, y "clientes recurrentes" es una
  proporción binaria con los tokens ya existentes. El validador de paleta
  categórica no aplica acá (correría en FAIL "by design" contra un ramp
  secuencial — ver `references/color-formula.md` de la skill).
- **`StatCard`** sigue el contrato "stat tile" de la skill (label, value,
  delta con signo y color por dirección×si-es-bueno) — sin sparkline, fuera
  de alcance por ahora.
- **Período = fecha del `Slot` (el partido), no `creada_at` de la `Reserva`.**
  Significa que reservas confirmadas para partidos *futuros* no cuentan como
  "ingresos del período" hasta que la fecha del partido ya haya pasado — es
  intencional (el dashboard reporta actividad ya sucedida, no bookings
  pendientes), pero es una decisión de modelado, no la única válida. Alguien
  podría preferir que "ingresos confirmados" cuente el momento del pago
  (`resuelta_at`) en vez de la fecha del partido — revisar si en la práctica
  el AdminCancha lo encuentra confuso.
- **Todo se calcula en JS sobre filas ya traídas**, no con agregados SQL
  (`GROUP BY`, funciones de ventana) — mismo criterio que el resto del
  proyecto (SPEC.md 10.3, 20 canchas no justifica esa complejidad).
- **Sin selector de cancha** (doc 6.6 sigue diferido): agrega todas las
  canchas del admin, mismo patrón que `/admin/validaciones`.
- **"No-show" de SPEC.md 3.3 no se implementó** — la máquina de estados de
  `Reserva` (SPEC.md 5.2) nunca definió un estado de no-show, así que no hay
  dato que agregar. Se muestra solo tasa de cancelación (`cancelada` +
  `rechazada` + `expirada`). Si se quiere trackear no-show de verdad hace
  falta un estado nuevo en la máquina de estados — cambio de spec, no de UI.
- **Exportar CSV** (`/api/insights/exportar`) devuelve filas crudas
  (cancha/fecha/hora/futbolero/estado/monto) del período, no las métricas
  agregadas — un admin export típicamente quiere el detalle para su propia
  contabilidad, no los mismos números que ya ve en pantalla. PDF (que
  también pide SPEC.md 3.9) no se implementó — CSV cubre el caso de uso real
  (importar a Excel/Sheets) con mucho menos esfuerzo.
- **Verificado con datos reales de prueba** (6 reservas confirmadas
  insertadas vía service role con fechas pasadas distintas, creadas y
  borradas en la misma sesión): heatmap, gráfico de ingresos por semana,
  cálculo de recurrencia y exportación CSV — todos correctos contra
  Supabase real, no solo contra código leído.

## 2026-09-15 — Ejecución de plan-mejoras.md (revisado antes de ejecutar)

Se revisó plan-mejoras.md antes de implementarlo y se ajustó el alcance:

- **#2 (nombre del Futbolero) — descartado**, no implementado. Agregar un
  campo "nombre" al login contradice la instrucción explícita del usuario
  de mantener el login a solo email. El local-part del email como nombre
  de display queda como parte aceptada del trade-off temporal.
- **#5 (tests automatizados) — bajado de alcance.** No se instaló ningún
  framework de test ni se escribió un test permanente: no hay Supabase
  local (Docker no disponible en este entorno) y cualquier test tendría que
  correr contra el proyecto de producción. En cambio, se **verificó la
  garantía de no-doble-reserva con un script desechable** (dos inserts
  concurrentes reales vía REST API con service role contra un slot
  temporal, limpiado después): un insert ganó (201), el otro fue rechazado
  por el trigger `retener_slot_al_crear_reserva` con el mensaje "no está
  disponible" — la garantía de SPEC.md 10.2 quedó probada bajo concurrencia
  real, no solo por lectura de código. La decisión de qué framework de test
  usar y cómo correrlo contra una DB de test queda pendiente de conversar
  con el humano a cargo, no se decidió unilateralmente.
- **#6 (cámara real)** — no se pudo probar, requiere un dispositivo físico.

Implementado: #1 (`lib/obtenerUrlComprobanteFirmada.ts` — loguea el error
en vez de descartarlo, reintenta una vez), #3 (`RatingResumen.tsx` —
"Sin calificaciones todavía" cuando `rating_promedio = 0`, que solo puede
significar cero filas en `calificaciones` ya que `puntaje` está restringido
a 1-5), #4 (restyle de `admin/canchas/nueva` y `admin/canchas/[id]/slots/nueva`
con el sistema de diseño), #7 (tabs Activas/Pasadas en Mis Reservas —
activa = `creada`/`pendiente_validacion` siempre, o `confirmada` con fecha
no pasada; el resto es pasada).

## 2026-09-15 — Ejecución de plan-ui-ux-canchas-fut5-cr.md (Fase 0-3)

Se agregó `plan-ui-ux-canchas-fut5-cr.md` (spec de UI/UX completa) al repo y
se ejecutó el plan aprobado en `/Users/juliangarro/.claude/plans/soft-knitting-jellyfish.md`
— sistema de diseño + componentes compartidos + camino crítico Futbolero +
cola de validación global del AdminCancha. Resumen de lo implementado y lo
diferido (ver ese archivo de plan para el detalle completo de cada fase):

- **Sistema de diseño**: shadcn/ui (preset `base-nova`, primitivas Base UI —
  no Radix; usar prop `render={<Link .../>}`, no `asChild`), Inter vía
  `next/font`, paleta semántica de doc 2.1 sobreescrita en `app/globals.css`
  bajo `@theme` (no hay `tailwind.config.ts`, Tailwind v4 es CSS-first).
- **URLs**: se mantuvo el prefijo `/futbolero/...` / `/admin/...` en vez de
  las rutas sin prefijo del doc — decisión tomada con el usuario para no
  romper el middleware de guard-por-rol ya probado.
- **Momento de creación de la `Reserva` cambió**: antes se creaba al tocar
  un `Slot`; ahora se crea recién al confirmar "Ya pagué, subir comprobante"
  en la nueva pantalla de resumen (`app/futbolero/canchas/[canchaId]/reservar/[slotId]/`),
  vía Server Action ligada al submit — deliberadamente NO es un Link ni pasa
  por el Server Component de la siguiente pantalla, porque el prefetch de
  Next.js renderiza esa página especulativamente al pasar el mouse/hacer
  scroll, y un mutate ahí crearía reservas fantasma. La pantalla de subir
  comprobante (`.../comprobante/`) es de solo lectura: busca una reserva
  activa existente para ese slot+usuario, nunca crea una si no la encuentra.
- **Cola de validación pasó de por-cancha a global**: `/admin/validaciones`
  agrega pendiente_validacion de todas las canchas del admin (doc 6.2). La
  ruta vieja `/admin/canchas/[id]/validacion` ahora solo redirige a la
  nueva, para no romper links ya compartidos.
- **Diferido explícitamente, no construido**: geolocalización/filtros de
  distancia y precio en Buscar, Calificar cancha (no hay escritura a
  `calificaciones` conectada desde UI), Perfil (Futbolero y AdminCancha),
  vista calendario semanal de horarios (se mantiene el form simple actual),
  selector de canchas, CRUD completo de info de cancha (fotos/amenidades),
  dashboard de insights con gráficos, banner de offline, auditoría de
  accesibilidad dedicada. Los forms de admin `canchas/nueva` y
  `canchas/[id]/slots/nueva` tampoco se restylaron (fuera del alcance
  aprobado) — siguen con las clases Tailwind planas de antes.

## 2026-09-15 — Fix: `.env.example` nunca se había commiteado

El `.gitignore` que genera `create-next-app` trae `.env*`, que sin querer
también ignora `.env.example` (el archivo plantilla, sin secretos, que SÍ
debe estar en el repo). Nunca se detectó porque `git status` simplemente no
lo mostraba. Se agregó `!.env.example` como excepción. Además, en algún
punto se pegaron credenciales reales de Supabase (URL, anon key, service
role key) directamente en `.env.example` en vez de `.env.local` — como el
archivo nunca se commiteó, no hubo exposición real en GitHub, pero se
movieron esos valores a `.env.local` (si el service role key te preocupa
igual, rotarlo desde Supabase Dashboard → Settings → API es gratis y rápido).
`.env.example` quedó de nuevo con placeholders vacíos.

## 2026-09-15 — Login simplificado sin contraseña (temporal)

A pedido explícito: se reemplazó el login/registro con contraseña por un
flujo de un solo paso — email + tipo de cuenta (Futbolero/AdminCancha), sin
verificar que quien escribe el email sea su dueño. Implementación en
`app/login/actions.ts` (`entrar`): usa el service role para crear el usuario
si no existe (`admin.createUser` con `email_confirm: true`, sin contraseña) y
generar un magic link (`admin.generateLink({ type: 'magiclink' })`), y lo
canjea en el mismo request con `verifyOtp({ type: 'magiclink', token_hash })`
sobre el cliente anon-key ligado a cookies — nunca se manda ni se espera un
email. Un usuario que ya existe entra directo con el rol que ya tenía
(ignora el radio button si no coincide); no se puede cambiar el rol desde
acá (ver trigger `evitar_cambio_de_rol`, migración `00000000000003`).

**Esto es intencionalmente inseguro y temporal.** Cualquiera que sepa el
email de otra persona puede entrar a su cuenta — no hay ninguna prueba de
identidad. El login/registro con contraseña original (SPEC.md 3.1.1) sigue
en `app/login/actions.ts` (función `login`, comentada) y en el historial de
git de `app/register/` — reactivarlo antes de operar con canchas/usuarios
reales. `/register` ahora solo redirige a `/login`.

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
