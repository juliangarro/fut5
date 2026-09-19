# Estrategia de pruebas — Dale Cancha

*Punto de partida: el repo hoy tiene **cero** tests automatizados, cero CI, y un único
proyecto Supabase que **es** producción (sin staging — ver `HANDOFF.md`). Toda la
verificación hasta ahora fue manual: lectura de código, `tsc`/`eslint`, y pruebas a mano
contra datos reales de producción (ver `DECISIONS.md`, ej. la prueba de concurrencia de
doble reserva con inserts REST reales, o la de insights con filas insertadas y borradas
en la sesión). Esta guía no asume que eso cambia de un día para otro — define qué
agregar primero, con qué herramienta, y qué mantener manual mientras no exista un
ambiente de staging.*

## 0. Restricciones que moldean esta estrategia

- **Solo-dev, sin CI todavía.** No hay `.github/workflows`. Los tests deben poder
  correr en local con un comando (`npm test`) antes de pensar en pipelines.
- **Sin staging.** El único Supabase es producción. Los tests de integración/E2E que
  toquen la base **no pueden correr contra ese proyecto**. Precondición dura antes de
  tener integración/E2E automatizados: un segundo proyecto Supabase (gratis) o
  `supabase start` local vía Docker, sembrado con las mismas migraciones de
  `supabase/migrations/`.
- **La autorización real vive en RLS + triggers, no solo en las rutas API.** El code
  review de esta sesión encontró que `reservas_update_futbolero` permitía a un
  futbolero setear `estado = 'confirmada'` a mano vía el cliente de Supabase,
  saltándose las rutas de Next.js por completo (cerrado en
  `supabase/migrations/00000000000006_autorizar_transiciones_reserva.sql`). Esto es la
  razón concreta por la que las pruebas de RLS/triggers van primero en esta lista, no
  al final como "daría gusto tenerlas": son la capa donde ya hubo un bug real de
  seguridad.
- **`HANDOFF.md` tiene una regla dura**: no tocar `app/**/actions.ts`, `app/api/**`,
  `supabase/migrations/**`, `lib/supabase/**` ni la máquina de estados de `Reserva`
  sin que el usuario lo pida explícitamente. Agregar tests no debería requerir tocar
  esos archivos de producto — donde haga falta un pequeño refactor para hacer algo
  testeable (ej. extraer una función pura), tratarlo como una propuesta aparte, no
  como parte de "agregar tests".

## 1. Prioridad por riesgo, no por pirámide

En vez de "unit primero porque son baratos", el orden acá es por qué se rompe más caro
si falla:

| Prioridad | Área | Por qué |
|---|---|---|
| P0 | RLS policies + triggers de `reservas` (máquina de estados, transición por rol) | Es el límite de autorización real. Un bug acá = plata (reservas gratis sin comprobante) o exposición de datos de otro usuario. Ya hubo un incidente real esta sesión. |
| P0 | Concurrencia de doble reserva (`retener_slot_al_crear_reserva` + índice único) | Ya se probó manualmente una vez (`DECISIONS.md`); sin test automatizado, un cambio futuro al trigger o al índice puede romperlo sin que nadie lo note hasta que dos personas paguen por el mismo horario. |
| P1 | Rutas API con lógica de autorización propia (`_ownership.ts`, `comprobante/route.ts`, `confirmar/route.ts`, `rechazar/route.ts`, `cron/expirar-reservas/route.ts`) | Segunda capa de defensa; errores acá son del tipo "un admin ve/aprueba reservas de otra cancha". |
| P1 | Lógica pura de negocio en `lib/` (`insights.ts`, `franjas.ts`, `fecha.ts`, `formato.ts`, `admin/panel.ts`, `admin/contarPendientes.ts`) | Barata de testear, y son los cálculos que alimentan el dashboard de insights y la agenda — errores silenciosos (ej. un rango de fecha mal calculado) no truenan, solo muestran números mal. |
| P2 | Componentes cliente con estado propio (`ComprobanteUploader`, `ReservaEstado`, `ContadorExpiracion`, `SlotPicker`) | Ya hubo un bug de estado real acá esta sesión (el uploader se quedaba "congelado"). Son componentes con máquinas de estado a mano, no solo presentación. |
| P3 | Flujos completos end-to-end (reservar → subir comprobante → admin confirma) | Dan la confianza más alta pero son los más caros de mantener sin CI; automatizar solo los 2-3 caminos dorados. |
| P4 | Presentación pura (`Avatar`, `Marca`, `StatCard`, `RatingStars`, `EstadoReservaBadge`) | Bajo riesgo, cambia seguido por diseño. No vale la pena testear más que un snapshot ocasional o nada. |

## 2. Herramientas propuestas

Ninguna está instalada todavía. Agregar solo lo que se vaya a usar en el orden de la
sección 3 — no instalar los cuatro paquetes en un solo commit sin tests reales detrás.

| Capa | Herramienta | Por qué esta y no otra |
|---|---|---|
| RLS / triggers / funciones SQL | [pgTAP](https://pgtap.org/) vía `supabase test db`, o un script Node con `service-role` + clientes con distintos JWT simulados | `pgTAP` es lo que Supabase CLI soporta nativo (`supabase test db`) y corre contra la misma base local que las migraciones ya usan — no hay que mantener un segundo lenguaje de fixtures. |
| Unit (lib/) | [Vitest](https://vitest.dev/) | Next.js 16 + React 19 + ESM nativo; Vitest no necesita configuración de transform aparte como Jest con este stack, y comparte watch mode rápido con el resto del tooling (`eslint` ya usa flat config). |
| Componentes | Vitest + [Testing Library](https://testing-library.com/react) (`@testing-library/react`) | Ya viene bien integrado con Vitest; permite testear los componentes `"use client"` sin levantar un browser real. |
| Rutas API / Server Actions | Vitest, invocando las funciones exportadas de `route.ts`/`actions.ts` directamente con un `NextRequest` armado a mano, mockeando `@/lib/supabase/server` | Next.js App Router no necesita un servidor corriendo para testear un route handler: son funciones exportadas normales. Mockear el cliente Supabase evita depender de una base para esta capa (la capa de autorización real ya se cubre con pgTAP). |
| E2E | [Playwright](https://playwright.dev/) | Ya sería necesario para probar PWA/mobile viewport (`resize_window` del navegador de este agente hace algo parecido a mano); Playwright es el estándar para Next.js y tiene buen soporte de `webServer` para levantar `next dev` solo. |

## 3. Qué agregar, en orden

### Fase 1 — RLS y triggers (P0, sin depender de nada nuevo salvo Supabase CLI local)

Precondición: `supabase init` + `supabase start` (Docker) para tener una base local
sembrada con `supabase/migrations/*.sql`, separada de producción. Esto es la única
inversión de infraestructura no opcional de todo este plan.

Casos a cubrir con pgTAP (`supabase/tests/`):

- Un futbolero **no puede** hacer `update reservas set estado = 'confirmada'` sobre su
  propia fila (el bug que se acaba de cerrar — este test es el que evita que vuelva).
- Un futbolero **no puede** cambiar `monto`, `futbolero_id` ni `slot_id` de su reserva.
- Un futbolero **sí puede** cancelar su reserva desde `creada`, y **no puede**
  cancelarla desde `pendiente_validacion` ni `confirmada`.
- Un admin **solo puede** transicionar `pendiente_validacion → confirmada/rechazada`,
  nunca `creada → confirmada` directo ni tocar una reserva de una cancha ajena.
- `es_admin_de_slot` / `es_admin_de_cancha` devuelven `false` para un admin que no es
  dueño.
- Un usuario no puede leer (`select`) reservas ajenas (`reservas_select_propia_o_admin`).
- El trigger `usuarios_evitar_cambio_rol` rechaza un `update usuarios set rol = ...`.
- Storage: un futbolero no puede leer el comprobante de otra reserva
  (`comprobantes_select_dueno`), y no puede subir un comprobante a una reserva que no
  es suya o que no está en `creada` (`comprobantes_insert_dueno`).

### Fase 2 — Concurrencia de doble reserva (P0)

Un test de integración (puede vivir junto a los de Fase 1, o como script Node aparte
contra la base local) que dispare **dos inserts simultáneos** sobre el mismo `slot_id`
con dos usuarios distintos (como ya se hizo a mano según `DECISIONS.md`) y verifique
que exactamente uno tiene éxito y el otro falla por el índice único parcial
`reservas_slot_activa_unica`. Este es el test de mayor ROI de todo el plan: automatiza
una prueba manual que ya se hizo una vez y que es fácil de romper sin darse cuenta al
tocar el trigger `retener_slot_al_crear_reserva`.

### Fase 3 — `lib/` puro (P1, Vitest, sin mocks de Supabase)

Empezar por lo que ya tiene lógica no trivial:

- `lib/insights.ts` — `rangoPeriodo(dias)`: límites de fecha correctos para cada
  período de `PERIODOS`, incluyendo bordes de mes/año.
- `lib/franjas.ts` y `lib/fecha.ts` — agrupación de horarios por franja, formateo de
  fechas límite (medianoche, cambio de mes).
- `lib/formato.ts` — `formatearColones`, `formatearHoraDeTimestamp`,
  `formatearRangoHoras`: casos de borde con hora que cruza medianoche si aplica.
- `lib/admin/contarPendientes.ts` / `lib/admin/panel.ts` — agregaciones que alimentan
  el dashboard del admin.
- `csvEscape` en `app/api/insights/exportar/route.ts` — ahora que neutraliza
  `=+-@`/tab/CR, un test unitario barato que evite que una futura edición reintroduzca
  el CSV injection.

### Fase 4 — Rutas API con mocks (P1, Vitest)

Para cada route handler, testear sin base real, mockeando `createClient()`:

- `app/api/reservas/[id]/comprobante/route.ts`: rechaza sin auth (401), rechaza si la
  reserva no es del usuario (403), rechaza si `estado !== 'creada'` (409), rechaza
  archivo no permitido/tamaño excedido (400), éxito sube y actualiza.
- `app/api/reservas/[id]/confirmar/route.ts` y `rechazar/route.ts`: reusar
  `_ownership.ts` — testear esa función aparte (es pura respecto a un cliente
  mockeado) para no repetir los 4 casos (no auth / no existe / no autorizado / ok) en
  cada ruta.
- `app/api/cron/expirar-reservas/route.ts`: 401 sin `CRON_SECRET` configurado (el fix
  de esta sesión — antes esto pasaba con el header literal `"Bearer undefined"`), 401
  con secret incorrecto, 200 con secret correcto.
- `app/api/insights/exportar/route.ts`: CSV vacío cuando el admin no tiene canchas,
  headers correctos, escapado de comas/comillas/fórmulas.

### Fase 5 — Componentes con estado (P2, Vitest + Testing Library)

Priorizar los que ya tuvieron bugs reales de estado esta sesión:

- `ComprobanteUploader`: idle → comprimiendo → listo → subiendo → enviado; reintentos
  en fallo de red; muestra error no reintentable en 4xx; el timeout de 20s dispara
  reintento (usar fake timers).
- `ReservaEstado`: cancelación exitosa cierra el diálogo; cancelación fallida muestra
  toast y no deja la promesa sin manejar (regresión del fix de esta sesión); la
  actualización realtime cambia el estado mostrado.
- `ContadorExpiracion`: cuenta regresiva correcta, estado "vencido" al llegar a cero.
- `ConfirmDialog`: foco y cierre con Escape/backdrop (accesibilidad, ver mínimos de
  `HANDOFF.md`).

### Fase 6 — E2E (P3, Playwright, requiere Fase 1 completa para tener una base de
prueba segura donde correr esto)

Dos caminos dorados nada más, para no generar carga de mantenimiento sin equipo de QA:

1. Futbolero: buscar cancha → ver detalle → reservar slot → subir comprobante → ver
   estado "pendiente de validación".
2. Admin: ver cola de validación → aprobar un comprobante → verificar que la reserva
   del futbolero pasa a "confirmada" (probar el realtime de punta a punta).

Correr contra `next dev` + la base local de Supabase (nunca contra producción).

## 4. Qué no vale la pena automatizar (por ahora)

- Componentes de solo presentación (sección P4) — cambian seguido con el diseño;
  mejor cubrirlos con revisión visual manual o `design-critique`, no con snapshots que
  se vuelven ruido.
- El flujo de login passwordless (`app/login/actions.ts`) — es un stopgap documentado
  para reemplazarse (ver `DECISIONS.md`), no vale la pena testear su forma actual en
  profundidad; sí vale un test de humo simple ("entrar con email crea/loguea
  usuario") para no romperlo sin querer mientras siga en uso.
- PostGIS/`ubicacion` (M14) — sin ningún flujo de UI conectado todavía (ver
  `COMPONENTES-TECNICOS-REAL.md`), no hay nada que testear hasta que exista una
  feature real encima.

## 5. Cobertura objetivo (orientativa, no una puerta de CI todavía)

No hay CI para hacer cumplir un número, así que esto es una guía de "cuándo parar",
no un umbral bloqueante:

- RLS/triggers (Fase 1-2): cobertura de **casos**, no de líneas — cada política de
  `00000000000003_rls_policies.sql` y cada rama de
  `00000000000006_autorizar_transiciones_reserva.sql` con al menos un test que la
  ejercite en positivo y uno en negativo.
- `lib/`: apuntar a que cada función exportada con más de una rama (`if`/`switch`)
  tenga un test por rama. No testear getters ni funciones de una línea.
- Rutas API: un test por código de status distinto que la ruta pueda devolver.
- Componentes: un test por estado del componente (no por prop combinatoria).

## 6. Próximo paso concreto

1. `supabase init` + `supabase start` local (única pieza de infraestructura nueva).
2. Fase 1 (pgTAP) — específicamente el test de "futbolero no puede auto-confirmarse",
   porque es la regresión de un bug real que ya ocurrió.
3. Fase 2 (concurrencia) — automatiza una prueba manual que ya se hizo una vez.
4. Recién ahí instalar Vitest y arrancar Fase 3, que es la más barata de mantener.

CI (GitHub Actions corriendo `tsc`, `eslint`, Vitest y pgTAP contra Supabase local en
cada PR) queda fuera de este documento — es un paso natural una vez que exista algo
que correr, no antes.

Los casos de monetización de la sección 7 no son una fase aparte — se agregan a las
Fases 1/3/4 de arriba el día que se ejecuten, usando la misma infraestructura
(`supabase start` local, Vitest). No justifican adelantar el orden.

## 7. Monetización (suscripciones, add-ons, insights Pro) — plan de testeo

*Agregado 18 set 2026, junto con `supabase/migrations/00000000000009-11`,
`lib/suscripciones.ts`, `lib/insightsPro.ts` y la sección Pro de
`/admin/insights`. Ver `plan-monetizacion-admin.md` sección 6 y `DECISIONS.md`
para el diseño; esto es solo el plan de testeo — nada de esta sección está
implementado todavía (ver "Qué falta decidir" al final).*

### 7.1 RLS de `suscripciones`/`addons_suscripcion` (Fase 1, P0)

El caso de mayor ROI es el mismo patrón que ya causó un incidente real en este
repo (`reservas_update_futbolero`, ver sección 1): **ninguna de las dos tablas
tiene policy de insert/update/delete a propósito** (solo escribe ops vía
service role) — eso depende de que Postgres deniegue por default cuando RLS
está activo y no hay policy que matchee la operación. Un test que lo confirme
explícitamente es barato y es exactamente el tipo de cosa que se rompe sin
aviso si alguien "simplifica" la RLS más adelante:

- Un admin autenticado **no puede** `insert`/`update`/`delete` sobre
  `suscripciones`, ni la propia ni la de otro admin (todas deben fallar por
  RLS, no solo por lógica de aplicación).
- Mismo test para `addons_suscripcion`.
- Un admin **puede** `select` su propia fila de `suscripciones`; **no puede**
  leer la de otro admin.
- `addons_suscripcion` tiene dos policies de SELECT combinadas por OR — el
  caso más fácil de romper sin darse cuenta:
  - Un admin **puede** leer su propia fila de `moderacion_reportes`; un
    admin **distinto no puede** leerla (no hay policy pública para esta).
  - Cualquier usuario autenticado (no solo el dueño) **puede** leer una fila
    `destacado` con `estado = 'activo'` de una cancha ajena — es el
    comportamiento intencional (es pública en la UI), no un leak.
  - Ese mismo usuario **no puede** leer una fila `destacado` con
    `estado = 'vencido'` de una cancha ajena — la policy pública exige
    `estado = 'activo'` explícitamente; un test que solo probara el caso
    `'activo'` no detectaría una regresión acá.

### 7.2 Función `vencer_suscripciones_y_addons` (Fase 1, P0 — mismo criterio que `autorizar_transiciones_reserva`)

- `suscripciones` con `estado='activa'` y `periodo_actual_fin` vencido pasa a
  `en_gracia` con `gracia_hasta = hoy + suscripcion_gracia_dias` (probar
  también que respeta un valor de config distinto al default de `7`).
- `suscripciones` con `estado='en_gracia'` y `gracia_hasta` vencido pasa a
  `vencida`.
- `suscripciones` con `estado='activa'` y `periodo_actual_fin` **futuro** no
  se toca (caso negativo — el más fácil de omitir).
- `addons_suscripcion` con `estado='activo'` y `periodo_actual_fin` vencido
  pasa a `vencido`; uno con fecha futura no se toca.
- La función **nunca** mueve `vencida → activa` ni `vencido → activo` (solo
  avanza) — reactivar es manual por diseño (sección 6.3 del plan); un test
  que lo confirme documenta esa garantía en código, no solo en el plan.

### 7.3 `lib/suscripciones.ts` (Fase 3, P1, Vitest)

El caso no obvio acá es la asimetría del kill switch — documentada en el
código pero fácil de "corregir" mal si alguien no lee el comentario:

- `nivelDeAcceso`: sin fila → `'gratis'`; `estado='activa'` → el `tier` de la
  fila; `estado='en_gracia'` → también el `tier` (no `'gratis'` — el período
  de gracia mantiene acceso); `estado='vencida'` → `'gratis'`.
- `nivelDeAcceso` con `monetizacion_habilitada='false'` → siempre
  `'pro_plus'`, sin importar el estado real de la fila (fail-open).
- `tieneDestacado`/`tieneModeracionReportes` con `monetizacion_habilitada='false'`
  → **no** cambian de comportamiento (siguen devolviendo `false` si no hay
  fila `activo`) — este es el test que evita que alguien unifique por error
  el fail-open de `nivelDeAcceso` con los add-ons, que rompería la lectura
  de "Destacado" (marcaría a todas las canchas como patrocinadas).
- `tieneDestacado` exige `cancha_id` exacto + `addon='destacado'` +
  `estado='activo'`; `tieneModeracionReportes` exige `cancha_id is null`
  (nunca debe confundir una fila `destacado` de esa misma cancha).

### 7.4 `lib/insightsPro.ts` (Fase 3, P1, Vitest — con una salvedad)

A diferencia de `lib/insights.ts` (que Fase 3 ya planea testear), estas
funciones no son puras: cada una arma sus propias queries `.from().select()`
contra un `SupabaseClient` real. Testearlas con Vitest requiere mockear la
cadena fluida del query builder (`.from().select().in().gte().lte()`, etc.)
por cada tabla que tocan — factible pero verboso, y no encaja en el patrón
"sin mocks de Supabase" que la Fase 3 usa para el resto de `lib/`.

**Qué falta decidir antes de escribir estos tests** (no es parte de "solo
agregar tests" — HANDOFF.md pide tratar un refactor de testeabilidad como
propuesta aparte, no colarlo acá): separar cada función en un cálculo puro
(recibe arrays de `slots`/`reservas` ya traídos) + un wrapper delgado que
hace las queries, igual que ya separa `calcularInsights` sus datos crudos de
su agregación — solo que ahí el cálculo vive inline, sin extraer. Con esa
separación, cada umbral queda como un test de tabla barato:

- `MIN_SLOTS_PARA_HORA_MENOS_OCUPADA` (3): una franja con 2 slots no debe
  aparecer como `horaMenosOcupada`; una con 3 sí.
- `UMBRAL_CAIDA_OCUPACION_PUNTOS` (10): una caída de 9 puntos → `null`; de
  10 → alerta.
- `UMBRAL_CRECIMIENTO_TENDENCIA_PCT` (30) y `MIN_RESERVAS_RECIENTES_TENDENCIA`
  (2): crecimiento de 29% → se descarta; de 30% con solo 1 reserva/semana
  reciente → también se descarta (dos condiciones, no alcanza con probar una).
- `MIN_CANCHAS_MUESTRA_BENCHMARK` (5): 4 canchas ajenas en la muestra →
  `benchmarkOcupacion = null`; 5 → devuelve el promedio. Este es el test de
  mayor peso de negocio del archivo — es la garantía de anonimato completa,
  no un detalle de UI (ver plan-monetizacion-admin.md sección 2).

Sin la separación, la alternativa más barata es un puñado de tests de
integración contra Supabase local (misma base de Fase 1) en vez de Vitest
puro — cubre lo mismo, pero corre más lento y mezcla capas. Decidir esto
antes de instalar Vitest para este archivo específico, no bloquea el resto
de la Fase 3.

### 7.5 `/api/cron/vencer-suscripciones` (Fase 4, P1, Vitest con mocks)

Idéntico a los 3 casos ya planeados para `expirar-reservas` en la Fase 4 (es
una copia deliberada del mismo patrón): 401 sin `CRON_SECRET` configurado,
401 con secret incorrecto, 200 con secret correcto y llamada a
`vencer_suscripciones_y_addons` vía RPC.

### 7.6 Gating en `/admin/insights` — por qué NO es una categoría nueva

La sección Pro de la página no tiene estado propio (Server Component, sin
`"use client"`) — no encaja en la Fase 5 (componentes con estado). La lógica
de gating real (`nivelDeAcceso`) ya se cubre en 7.3; lo único que hace la
página es llamarla una vez y ramificar el render. Cubrir "un admin gratis ve
el upsell, uno Pro ve los insights" como parte del camino dorado de admin en
la Fase 6 (E2E) es suficiente — no vale la pena una categoría de test nueva
solo para esto.

### 7.7 Verificación manual ya hecha (sin reemplazar lo de arriba)

Ambas piezas de esta sesión se probaron a mano contra producción, mismo
patrón que la Fase 0 informal de `DECISIONS.md` (dashboard de insights base,
18 set 2026): insertar fila de prueba vía service role, correr la lógica
contra datos reales, confirmar a mano, borrar. Cubre "¿el cálculo da un
número razonable hoy?", no reemplaza los casos negativos/de borde de 7.1-7.5
(esos no se pueden probar a mano de forma confiable — son exactamente el
tipo de caso que un test automatizado existe para cubrir).

## 8. QA manual dirigido en Preview — "como usuario" (UI/visual)

*Agregado 2026-09-18, a raíz de una sesión de debugging real contra el deploy de
Preview (`fut5-bv3a8fcx5-...vercel.app`) que encontró 4 bugs en menos de una hora
— ninguno de los cuales las Fases 1-6 de arriba habrían atrapado, ni lo harían si
se ampliara su cobertura de línea. No reemplaza nada de lo anterior; es la capa que
falta arriba de la pirámide, explícitamente dejada fuera en la sección 4
("componentes de presentación... mejor revisión visual manual") sin nunca decir
*cómo* ni *cuándo* hacer esa revisión. Esta sección lo hace concreto.*

### 8.0 Por qué es una capa aparte, no "más E2E"

Los 4 bugs de la sesión del 18 de septiembre, y por qué ninguna capa de arriba los
agarra:

| Bug | Por qué Fases 1-6 no lo cubren |
|---|---|
| Reintento de subida de comprobante rechazado con 409 falso (`ComprobanteUploader` y `PaginaAporte`) | El mock de Supabase en Fase 4 arma el estado que el test le pide — nadie escribió el caso "el estado ya cambió cuando llega el reintento" hasta que pasó de verdad. Es un gap de *caso*, no de herramienta: un test de Vitest lo hubiera atrapado si alguien lo hubiera pensado antes. |
| `IngresosTrend` (gráfico SVG) desproporcionado en desktop ancho | Vitest + Testing Library corre sobre jsdom: **no hay layout real**, `width`/`height`/viewBox de un SVG no se resuelven a píxeles como en un navegador. Este bug es estructuralmente invisible a Fase 5 sin importar cuántos tests se agreguen ahí. |
| Comprobante chico en el `Dialog` de `ColaValidacion` | Mismo problema: es un juicio de "¿esto se ve bien a este ancho de viewport?", no una aserción de DOM. Ni jsdom ni un assert de Playwright sobre `toBeVisible()` capturan "se ve chico". |
| 404/pantalla negra por `notFound()` en vez de `redirect()` + sin `not-found.tsx`/`global-error.tsx` propios | Esto sí era testeable con Vitest (un test de la ruta con `!user` → assert redirect) — es un caso real de "gap de cobertura", no de herramienta. Lo nuevo (`app/not-found.tsx`, `app/global-error.tsx`) hoy no tiene test de que se vean bien; ver 8.3. |

Conclusión operativa: 3 de los 4 bugs son de **percepción visual/proporción**, la
categoría que ninguna herramienta de assertions atrapa bien todavía (visual
regression con screenshots serviría, pero con un solo dev y sin CI el costo de
mantener baselines no se justifica hoy — ver "Qué no vale la pena automatizar").
La respuesta no es más Vitest, es una pasada manual dirigida, con checklist, hecha
como usuario real en el entorno real (Preview, no `next dev` local) — porque el bug
del gráfico y el de Vercel Auth de abajo (8.1) solo existen ahí, no en local.

### 8.1 Restricción dura: Preview tiene Vercel Authentication activado

Se descubrió en esta misma sesión: el navegador del agente (Claude in Chrome / el
browser embebido) no puede abrir `https://fut5-bv3a8fcx5-...vercel.app` directo —
Vercel Authentication redirige a un login de Vercel al que el agente no tiene
credenciales. Esto significa que **hoy esta pasada solo la puede hacer un humano**
(el usuario, logueado en su cuenta de Vercel) — un agente no puede correrla sin
ayuda. Dos formas de arreglar eso si se quiere que un agente la corra en el futuro:

1. **Vercel Protection Bypass for Automation**: Project Settings → Deployment
   Protection → generar un secret, y pasarlo como header
   `x-vercel-protection-bypass: <secret>` (o query param
   `?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true` para que
   el navegador lo recuerde en cookies). Es la vía soportada por Vercel para esto
   exacto — no requiere desactivar la protección del proyecto.
2. Desactivar Vercel Authentication solo para Preview deployments (dejarla en
   producción) — más simple, pero expone el Preview (con datos reales de
   producción, ver `HANDOFF.md` — un solo Supabase) a cualquiera con el link.
   **No recomendado** dado ese riesgo; la opción 1 es la correcta acá.

Mientras no se configure la opción 1, esta sección es una guía para que el usuario
la corra él mismo (con este checklist a mano), no algo que Claude pueda ejecutar de
punta a punta sin intervención.

### 8.2 Cuándo correrla

No en cada commit — es cara y depende de un humano. Disparadores:

- Antes de mergear cualquier PR/rama que toque `components/**/*.tsx` (estilos,
  layout, SVG a mano como `IngresosTrend`/`OcupacionHeatmap`) — la categoría exacta
  que 8.0 muestra que las otras fases no cubren.
- Después de cualquier cambio a `app/globals.css` (tokens de color/tema) — riesgo de
  romper contraste o el fondo de `not-found.tsx`/`global-error.tsx` (ver 8.3).
- Una vez por sesión de trabajo del usuario contra Preview, con el rol que esté
  usando ese día (Futbolero o AdminCancha) — barrido oportunista, no exhaustivo.
- **No** hace falta correrla en ramas que solo tocan `lib/`, `supabase/migrations/`
  o rutas API sin cambio de componente — esas ya las cubren las Fases 1-4.

### 8.3 Checklist — qué mirar, no solo qué clickear

Dos anchos de viewport siempre (mismos que ya usa `HANDOFF.md` para el rediseño):
**390px** (mobile) y **1280px** (desktop) — el bug de `IngresosTrend` de hoy *solo*
aparece en el ancho grande, así que probar solo mobile (como es el hábito, dado que
la app es mobile-first) lo deja pasar siempre.

**Como Futbolero:**
- [ ] Buscar cancha → detalle → reservar un slot → subir comprobante. Con conexión
  normal (no solo el camino dorado feliz de Fase 6): ¿el botón "Enviar" da feedback
  correcto si se hace doble click rápido? ¿Y si se cierra la pestaña a mitad de
  "Enviando…" y se vuelve a abrir la reserva — qué estado se ve?
- [ ] "Mis reservas" → abrir una reserva, dejar la pestaña abierta 10+ minutos
  (simula sesión por expirar), volver y navegar a otra reserva — ¿redirige a login
  limpio, o algo raro? (el bug de la entrada (5) de `DECISIONS.md` de hoy).
- [ ] Forzar una URL de reserva que no existe (`/futbolero/reservas/id-inventado`) —
  ¿se ve el `not-found.tsx` nuevo, con el fondo crema y el botón "Volver al inicio",
  o todavía algo en blanco?

**Como AdminCancha:**
- [ ] `/admin/insights`, período 7/30/90 días, **en 1280px**: ¿la barra más alta del
  gráfico de ingresos se corta arriba? ¿las etiquetas de semana se solapan? (el bug
  de hoy — usar esto como el caso de referencia de "qué se ve mal" hasta que se
  agregue un test visual).
- [ ] Cola de validaciones → tocar un comprobante para verlo a tamaño completo, en
  1280px: ¿se lee el monto/número SINPE sin tener que hacer zoom del navegador?
  (R7 en `plan-rediseno-dale-cancha.md`, todavía sin fix).
- [ ] `OcupacionHeatmap` con muy pocos datos (cancha nueva) y con muchos (varias
  semanas) — mismo tipo de riesgo de escala que `IngresosTrend`, no verificado hoy.
- [ ] Forzar un error real (ej. cortar la red en devtools a mitad de "Confirmar
  reserva") — ¿aparece el `global-error.tsx` nuevo con el botón "Reintentar", o una
  pantalla en blanco/negra?

### 8.4 Qué hacer con lo que se encuentre

Un hallazgo de esta pasada **no es un test automatizado que falta** — es texto en
`DECISIONS.md` (si ya se corrigió) o una fila nueva en la tabla de riesgos de
`plan-rediseno-dale-cancha.md` sección 6 (si queda pendiente), igual que R7 y las
entradas (4)-(6) de `DECISIONS.md` de hoy. Si el mismo tipo de bug aparece dos veces
(ej. otro SVG a mano que se desproporciona), ahí sí vale la pena evaluar visual
regression testing (Playwright `toHaveScreenshot()`) como Fase 9 — no antes, para no
pagar el costo de mantener baselines por un solo caso.
