# Handoff — sesión del 2026-09-18, implementación de TESTING.md (Fases 1–6)

> Para el siguiente agente (o para retomar en una sesión nueva). Documento
> separado de `HANDOFF.md` (ese es del rediseño visual, un tema distinto) —
> no permanente como SPEC.md/DECISIONS.md, se puede archivar una vez que el
> contenido relevante se folde a DECISIONS.md/TESTING.md si hace falta.

## Qué se hizo

Se ejecutaron **todas** las fases de `TESTING.md` de punta a punta, sobre un
repo que hasta esta sesión tenía cero tests automatizados. Todo corre en
verde ahora mismo. Comandos:

```bash
npx supabase start        # una vez, deja Postgres local en 127.0.0.1:54322
npx supabase test db      # Fase 1 — pgTAP, 24 tests
npx vitest run            # Fases 2-5 — 106 tests (unit, componentes, concurrencia)
npx playwright test e2e/  # Fase 6 — 2 caminos dorados con navegador real
```

Todo (`Docker` corriendo + `supabase start`) es precondición para las tres
capas — sin eso, `vitest run` igual pasa (Fase 2 y las que usan Postgres
fallan), pero `supabase test db` y `playwright test` necesitan la base local
arriba.

### Fase 1 — pgTAP (RLS + triggers), 24 tests
- [supabase/tests/reservas_autorizacion_test.sql](supabase/tests/reservas_autorizacion_test.sql) (14): la máquina de
  estados de `autorizar_transicion_reserva()` — auto-confirmar/rechazar,
  tamper de columnas, cancelación solo desde `creada`, admin no salta
  `creada→confirmada`, admin no toca cancha ajena.
- [supabase/tests/rls_policies_test.sql](supabase/tests/rls_policies_test.sql) (10): `usuarios_evitar_cambio_rol`,
  lectura de reservas ajenas, `es_admin_de_cancha`/`es_admin_de_slot`,
  policies de storage de `comprobantes` (select/insert).
- Verificado que no son tautológicos: se desactivó cada trigger/policy
  relevante una vez y se confirmó que el test correspondiente falla, luego
  se reactivó.

### Fase 2 — concurrencia de doble reserva, 1 test (el de mayor ROI del plan)
- [tests/integration/concurrencia-doble-reserva.test.ts](tests/integration/concurrencia-doble-reserva.test.ts): dos conexiones
  `pg` reales, cada una en su propia transacción, insertando sobre el mismo
  `slot_id` al mismo tiempo. Exactamente una tiene éxito.
- Verificado: con el trigger `reservas_retener_slot` desactivado y el índice
  único `reservas_slot_activa_unica` dropeado, el test falla (ambas tienen
  éxito) — se restauraron ambos después.

### Fase 3 — `lib/` puro + `contarPendientes`, 46 tests
Vitest instalado desde cero (no existía ningún framework de test). Archivos
colocados junto al código: `lib/insights.test.ts` (`rangoPeriodo`),
`lib/franjas.test.ts`, `lib/fecha.test.ts`, `lib/formato.test.ts`,
`lib/admin/contarPendientes.test.ts` (con mock de Supabase, ver abajo).

**Decisión tomada**: `lib/admin/panel.ts` (`datosPanel`) e `insightsPro.ts`
quedaron **sin testear** — son funciones con demasiadas queries encadenadas
para mockear con ROI razonable, mismo problema que `TESTING.md` sección 7.4
ya señalaba para `insightsPro.ts`. Si se quiere cobertura ahí, primero hace
falta el refactor "separar cálculo puro de queries" que esa sección
describe — no es parte de "agregar tests".

### Fase 4 — rutas API con mocks, 41 tests
`_ownership.test.ts`, `confirmar/route.test.ts`, `rechazar/route.test.ts`,
`comprobante/route.test.ts` (con `@vitest-environment node` — jsdom rompe
`FormData`+`File`+`Request` combinados), `expirar-reservas/route.test.ts`,
`vencer-suscripciones/route.test.ts`, `insights/exportar/route.test.ts`
(incluye el escapado CSV/fórmula, probado indirecto vía la respuesta HTTP
porque `csvEscape` no está exportado — no se tocó la ruta para exportarlo).

Helper compartido: [tests/helpers/supabaseMock.ts](tests/helpers/supabaseMock.ts) — builder encadenable
que imita `.from().select().eq()...` y resuelve como thenable.

### Fase 5 — componentes, 19 tests
`ComprobanteUploader.test.tsx`, `ReservaEstado.test.tsx`,
`ContadorExpiracion.test.tsx`, `ConfirmDialog.test.tsx`. Encontró un bug real
al escribirlos — ver sección siguiente.

### Fase 6 — E2E con Playwright, 2 caminos dorados
- [e2e/reserva-futbolero.spec.ts](e2e/reserva-futbolero.spec.ts): buscar → detalle → reservar slot → subir
  comprobante → ver "En revisión".
- [e2e/aprobar-admin.spec.ts](e2e/aprobar-admin.spec.ts): admin aprueba en la cola de validación → el
  futbolero (pestaña ya abierta, sin recargar) ve "Confirmada" vía realtime.
- [e2e/helpers/db.ts](e2e/helpers/db.ts): seed/limpieza con service role — **aborta si
  `NEXT_PUBLIC_SUPABASE_URL` no es localhost**, nunca puede tocar producción.
- [e2e/helpers/auth.ts](e2e/helpers/auth.ts): login vía el flujo `entrar` (email+rol, sin magic link
  real — ver `app/login/actions.ts`).
- [playwright.config.ts](playwright.config.ts): fuerza las credenciales del Supabase LOCAL (las que
  imprime `supabase start`, no son secreto — son las de dev por defecto de
  cualquier proyecto Supabase local) como `env` del `webServer`, para que
  ganen sobre `.env.local` (que apunta a producción — dotenv no pisa una env
  var ya seteada en el proceso). **Nunca cambiar esas URLs a algo que no sea
  127.0.0.1.**

## Bug real encontrado y arreglado: realtime silencioso en `ReservaEstado.tsx`

Mientras se armaba el camino dorado 2 (admin aprueba → futbolero ve
"Confirmada" sin recargar), el realtime **no llegaba nunca**, ni siquiera
con un `UPDATE` manual vía `psql` mientras la pantalla del futbolero estaba
abierta.

**Causa**: `components/ReservaEstado.tsx` llamaba a
`supabase.channel(...).on('postgres_changes', ...).subscribe()` de forma
síncrona, sin esperar a `supabase.auth.getSession()`. Como la app usa
`@supabase/ssr` (sesión en cookies, hidratada async), el join de Realtime
podía salir sin el `access_token` del usuario adjunto. Realtime evalúa las
RLS policies con ese token — sin él, evalúa como anónimo, y como
`reservas_select_propia_o_admin` exige `auth.uid()`, la suscripción quedaba
"conectada" (sin ningún error visible) pero nunca entregaba los
`postgres_changes` de esa fila.

Confirmado empíricamente con websockets raw contra el Realtime local: con
solo el anon key, cero eventos; con el JWT real del usuario, el evento
llega íntegro. Con el fix (esperar `getSession()` antes de suscribirse), el
golden path 2 pasa de forma estable.

**Fix aplicado** en `components/ReservaEstado.tsx` (ver diff — es chico,
~15 líneas, con guard de cancelación por si el efecto se desmonta antes de
que la promesa resuelva).

**Pendiente, ya delegado**: `components/futbolero/CobroGrupal.tsx` tiene el
mismo patrón (`useEffect` → `.channel()...subscribe()` sin esperar sesión),
línea ~170-192 — muy probablemente el mismo bug (contribuciones a un cobro
grupal no se verían en vivo). Se dejó como chip de tarea separada (no
verificado ni arreglado en esta sesión, para no meter un segundo cambio de
comportamiento sin confirmar primero que reproduce ahí también).

## Infraestructura nueva (todo local, nunca toca producción)

- **Docker Desktop** instalado y corriendo (no estaba antes de esta sesión).
- **Supabase CLI local**: `supabase/config.toml` ya existía; `supabase start`
  deja Postgres en `127.0.0.1:54322`, API en `127.0.0.1:54321`, Studio en
  `127.0.0.1:54323`. Seedea las 11 migraciones de `supabase/migrations/`.
- **Vitest** + Testing Library + jsdom, `vitest.config.ts` /
  `vitest.setup.ts` (fija `TZ=UTC` — el server real corre en UTC, y pinea
  el cleanup de RTL entre tests porque `test.globals` está apagado).
- **Playwright** (`@playwright/test`, Chromium instalado vía
  `npx playwright install chromium`).
- **`next.config.ts`**: se agregó `allowedDevOrigins: ["127.0.0.1"]`. Sin
  esto, Next bloquea el websocket de HMR cuando `next dev` corre en
  `127.0.0.1` (Playwright), y el cliente de Turbopack reintenta con reloads
  completos de página que resetean cualquier estado de componente a medio
  camino de una interacción — causaba fallos intermitentes y confusos en
  los tests de UI (tabs, radios) hasta que se diagnosticó.
- **`package.json`** — scripts nuevos: `test` (watch), `test:run`,
  `test:db` (alias de `supabase test db`), `test:e2e`.

## Cosas que quedaron sin hacer / decisiones abiertas

1. **CobroGrupal.tsx** — mismo bug de realtime, sin confirmar/arreglar (ver
   arriba, ya hay una tarea de seguimiento).
2. **`datosPanel`/`insightsPro.ts`** sin tests — necesitan el refactor de
   separar cálculo puro de queries antes (TESTING.md sección 7.4).
3. **No hay CI todavía** — sigue siendo manual (`npm run test:run`,
   `npx supabase test db`, `npx playwright test e2e/`), tal como
   `TESTING.md` documentaba desde el principio que sería el último paso.
4. Los tests E2E asumen que `supabase start` y `Docker` ya están arriba —
   no hay ningún `pretest` que lo verifique o lo levante solo.

## Notas para no repetir descubrimientos de esta sesión

- Los `<span role="radio">`/`<button role="tab">` de `@base-ui/react` **no**
  heredan nombre accesible de un `<label>` que los envuelve (no son
  elementos "labelable" nativos) — hay que apuntarles por selector
  (`label:has-text(...) >> [role=radio]`), no por `getByRole(..., {name})`.
  Ver `e2e/helpers/auth.ts`.
- El botón "Continuar" del `SlotPicker` es un `<a href>` real pero con
  `role="button"` explícito (patrón del design system,
  `Button nativeButton={false}`) — usar `getByRole("button", ...)`, no
  `"link"`.
- `jsdom` rompe la combinación `Request` + `FormData` + `File` nativos —
  cualquier test de una ruta que reciba `multipart/form-data` necesita
  `// @vitest-environment node` al tope del archivo.
