# Decision Records

Ver SPEC.md 10.7. Registro breve de decisiones no cubiertas explícitamente por
SPEC.md, para que el siguiente agente no tenga que re-descubrir el contexto.

## 2026-09-18 (6) — Fix: mismo bug de reintento no-idempotente en el comprobante de aportes (cobro grupal)

Pedido del usuario: "inspect for any smells" sobre el repo. Al revisar
`components/pago/PaginaAporte.tsx` encontré que su función
`subirComprobante` es casi un calco de `subirConReintentos` en
`ComprobanteUploader.tsx` (mismos reintentos, mismo timeout, misma lógica
de status code) — y que la ruta a la que le pega,
`app/api/pago/[token]/aportes/[aporteId]/comprobante/route.ts`, tenía
exactamente el mismo bug que ya se había corregido hoy en
`app/api/reservas/[id]/comprobante/route.ts` (ver entrada (4)... la (1)
de la sesión de hoy, arriba): un reintento tras un timeout con la subida
ya exitosa del lado del servidor (aporte movido a `comprobante_subido`)
se rechazaba con 409 "Este aporte ya tiene un comprobante en revisión."
en vez de tratarse como éxito idempotente.

Fix (mismo patrón): si `aporte.estado === "comprobante_subido"`, la ruta
ahora responde `200 { ok: true, already: true }` en vez de 409.
`"confirmado"` sigue bloqueando — ese sí es un cierre real, no algo que
un reintento propio deba superar.

**No agregué test para este archivo** — no existía ninguno
(`app/api/pago/[token]/aportes/[aporteId]/comprobante/route.ts` no tenía
`route.test.ts`, ni tampoco `app/api/aportes/[id]/confirmar/route.ts`) y
con el `node_modules`/`rolldown` roto de esta sesión (ver entrada (4)) no
podía correr vitest para verificar uno antes de dejarlo escrito — preferí
no comitear un test sin ejecutar. Pendiente una vez se reinstale
`node_modules`: escribir `route.test.ts` para esta ruta espejando
`app/api/reservas/[id]/comprobante/route.test.ts` (incluyendo el caso
`comprobante_subido` → 200 idempotente).

`npx tsc --noEmit` limpio.

## 2026-09-18 (5) — Fix: 404 y "pantalla negra" al navegar entre acciones

Reportado por el usuario: "a veces recibo un 404 y pantalla negra al
moverme entre acciones", sin pasos exactos de reproducción. Intenté
reproducirlo en vivo contra el deploy de preview
(`fut5-bv3a8fcx5-juliangarro26-4741s-projects.vercel.app`) con el
navegador del agente, pero esa URL tiene Vercel Authentication activado
(protección de preview deployments) y redirige a un login de Vercel al
que el agente no tiene acceso — no se pudo reproducir en vivo, el
diagnóstico de abajo sale de revisar el código.

Dos hallazgos que combinados explican ambos síntomas:

1. **`app/futbolero/reservas/[reservaId]/page.tsx` usaba `notFound()` para
   el chequeo de sesión** (`if (!user) notFound()`), a diferencia de
   *todas* las demás páginas protegidas del repo, que usan
   `redirect("/login")` (`app/futbolero/perfil/page.tsx`,
   `app/admin/canchas/page.tsx`, etc. — grep de `if (!user)` en `app/`
   los confirma). Si la sesión expira o el refresh de cookie en
   `proxy.ts`/`lib/supabase/middleware.ts` no llega a tiempo mientras el
   futbolero navega rápido entre pantallas (típicamente entrando a "Mis
   reservas" → detalle de una reserva), esta página mostraba un 404 en
   vez de mandar a loguearse de nuevo como en cualquier otro lugar de la
   app.
2. **No existía `app/not-found.tsx` ni `app/error.tsx` ni
   `app/global-error.tsx`** en todo el proyecto. Sin un `not-found.tsx`
   propio, cualquier `notFound()` (el del punto 1, u otro legítimo)
   mostraba la página 404 genérica de Next, sin el fondo crema ni el
   sistema de diseño — no es negra por sí sola, pero no tiene ninguna
   relación visual con el resto de la app. El caso más grave es sin
   `global-error.tsx`: una excepción no capturada que escapa incluso del
   `RootLayout` (ej. algo que tira antes de que el `<body>` con el fondo
   crema llegue a pintarse) hace que Next dibuje su propio documento de
   emergencia sin ningún estilo — en un sistema con modo oscuro (SO o
   navegador) esa página en blanco sin CSS puede pintarse casi negra,
   calzando con el reporte de "pantalla negra".

Fix:
- `reservas/[reservaId]/page.tsx`: `notFound()` → `redirect("/login")`
  para el chequeo de sesión, igual que el resto del repo.
- `app/not-found.tsx`: página 404 con el sistema de diseño (`EmptyState`
  visualmente, ícono + texto + botón "Volver al inicio"), en vez de la
  genérica de Next.
- `app/global-error.tsx`: página de error de emergencia con el mismo
  fondo crema de la app (tiene que traer su propio `<html>`/`<body>`
  porque reemplaza el layout entero, no solo el contenido) y un botón
  "Reintentar".

No cubre todas las causas posibles de un 404 real (ej. R1/R2 de
plan-rediseno-dale-cancha.md — reservas `creada` sin expiración, cron una
vez al día — pueden dejar recursos en estados raros que sí ameritan un
404 legítimo). Lo que este fix corrige es que ese 404, legítimo o no, ya
no se vea como una pantalla en blanco sin marca, y que el caso específico
de sesión vencida en la página de detalle de reserva ya no se confunda
con "la reserva no existe". `npx tsc --noEmit` limpio; no se corrió el
suite de tests por el mismo problema de `node_modules`/`rolldown` roto
mencionado en la entrada anterior — no relacionado a este cambio.

Pendiente si el usuario puede reproducirlo de nuevo: capturar la URL
exacta donde pasa y si la consola del navegador muestra algún error (F12
→ Console) en el momento del 404/pantalla negra — eso confirmaría si es
este bug de sesión u otra causa (ej. una `notFound()` distinta con datos
realmente ausentes por R1/R2).

## 2026-09-18 (4) — Fix: gráfico de `IngresosTrend` desproporcionado en desktop

Reportado por el usuario con captura de `/admin/insights`: la barra de la
semana con más ingresos aparecía cortada arriba (etiqueta "155k" fuera de
vista) y las etiquetas "Sem 1"..."Sem 5" se veían pegadas sin espacio,
todo dibujado varias veces más grande de lo normal.

Causa: el `<svg>` de `components/admin/IngresosTrend.tsx` (Fase 12 del
rediseño, ver plan-rediseno-dale-cancha.md) usaba `width="100%"` sin
`height`, tal como lo pedía el plan ("responsivo"). Sin un `height`
explícito, el navegador deriva el alto del aspect ratio del `viewBox`
(`ancho × (ALTO+24)`, con `ancho` chico — 192px para 5 semanas) y lo
escala para llenar el ancho real del contenedor. En un panel de admin
ancho en desktop eso multiplica todo (barras, texto de 12/13px, gap) por
un factor grande — de ahí el valor cortado arriba y las etiquetas
solapadas: no es un problema de datos, es que todo el SVG se infló.

Fix: `width={ancho}` y `height={ALTO + 24}` fijos en vez de `width="100%"`.
El gráfico ahora se dibuja siempre a su tamaño de diseño; `overflow-x-auto`
del contenedor (ya existía) sigue resolviendo el desborde en pantallas
angostas. Esto es una corrección sobre lo que decía el plan en Fase 12
("SVG con viewBox y width=\"100%\" (responsivo)") — el enunciado asumía
que "responsivo" implicaba solo estirar el ancho, pero sin alto fijo
termina estirando todo el dibujo. `npx tsc --noEmit` limpio; no se corrió
el suite de tests porque `node_modules` tiene un binario nativo de
`rolldown` roto en este entorno (bug conocido de npm con dependencias
opcionales, no relacionado a este cambio) — reinstalar `node_modules` lo
resolvería, pendiente de que el usuario lo confirme.

## 2026-09-18 (3) — Insights Pro en `/admin/insights` (los 4 adicionales de §2 del plan)

El dashboard base (`/admin/insights`) ya existía gratis para todos (ver
entrada "2026-09-15 — Dashboard de insights" más abajo). Esta entrada
agrega los 4 insights adicionales de `plan-monetizacion-admin.md` sección
2 ("Insights adicionales que agregaría para el tier pago"), gateados
detrás de `nivelDeAcceso` — nuevo archivo `lib/insightsPro.ts`, sección
nueva en `app/admin/insights/page.tsx` (upsell si `nivelDeAcceso ===
'gratis'`, insights reales si no).

- **Horario más rentable / hora con menos ocupación**: agrupa
  ingreso/ocupación por franja horaria dentro del período seleccionado.
  `horaMenosOcupada` exige mínimo 3 slots en la franja para no sacar
  conclusiones de una sola franja con 1-2 horarios.
- **Alertas proactivas**: comprobantes con +20 min sin validar (consulta
  en vivo, sin filtro de período) y caída de ocupación semana vs. semana
  anterior (umbral: solo alerta si cae ≥10 puntos, para no generar ruido
  por fluctuaciones menores).
- **Predicción simple de demanda**: media móvil de 6 semanas por (día de
  semana, hora) — compara promedio de las 3 semanas recientes vs. las 3
  anteriores, exige ≥2 reservas/semana de señal reciente y ≥30% de
  crecimiento para reportar. Sin ML, tal como pide la sección 2.
- **Benchmark de plataforma (comparación anónima de ocupación)**: acá
  hubo una corrección sobre lo que le dije al usuario antes de construir
  — asumí que hacía falta una función SQL `security definer` + migración
  nueva para leer datos de canchas ajenas. Al revisar la RLS existente,
  `slots` ya tiene `slots_select_publico for select using (true)`
  (00000000000001/3, no es nuevo) — así que el benchmark de **ocupación**
  se puede calcular con la sesión normal del admin, sin función nueva ni
  migración, filtrando en JS las canchas propias del resto. Ingresos NO
  se pueden benchmarkear igual (`reservas.monto` de otros admins sí está
  protegido por RLS) — eso sí necesitaría una función nueva, fuera de
  alcance de esta entrada. Guardia de anonimato: mínimo 5 canchas ajenas
  en la muestra (sugerido por el usuario), si no `benchmarkOcupacion` es
  `null`.

**Verificado contra producción** (mismo patrón que la entrada del
2026-09-15: datos reales, sin fabricar filas en `reservas`/`slots`):
script Node con service role que (1) encontró un admin real con canchas y
reservas confirmadas, (2) confirmó `suscripciones` vacío = gratis, (3)
insertó una fila de prueba `tier='pro'`, (4) confirmó la relectura, (5)
corrió la misma lógica de agregación que `lib/insightsPro.ts` contra los
datos reales de ese admin y verificó a mano que `ingresoPorHora` suma
igual al ingreso total, que `horaMasRentable` señala la franja correcta,
y que `benchmarkOcupacion` da `null` correctamente porque la plataforma
piloto hoy solo tiene 3 canchas ajenas (bajo el mínimo de 5) — la guardia
de anonimato funciona como se diseñó. (6) borró la fila de prueba y
confirmó que no quedó rastro. `npx tsc --noEmit` y `npm run lint`
también limpios.

## 2026-09-18 (2) — Decisiones de negocio pendientes en plan-monetizacion-admin.md §7

Cuatro de las cinco preguntas abiertas de la sección 7 del plan, resueltas
por el usuario con contexto completo de SPEC.md/DECISIONS.md/el pivote a
"Dale Cancha" (detalle y razonamiento completo en el plan, sección 7):

1. **Precio Pro/Pro+**: se mantiene el rango de la sección 1 (~₡10,000 /
   ~₡20,000) como ancla, se fija en firme después del piloto (SPEC.md
   12.1), no antes. **Precio de "Destacado"/moderación**: ₡3,000-5,000/mes
   por cancha destacada — bajo a propósito, compite por el mismo
   presupuesto que Pro y el AdminCancha típico es sensible a precio.
2. **Tier gratis**: ilimitado, sin topes de canchas/reservas — meter un
   tope apilaría fricción justo donde el plan dice que no hay que
   apilarla (riesgo #1: que ni prueben el flujo).
4. **Automatizar reactivación de pago**: no ahora, pero con gatillo
   concreto (>15-20 cuentas pagando activas, u ops reportando >X
   min/semana), no "cuando duela" — para que no sea deuda técnica
   invisible.

**Sin resolver (3 y 5), explícitamente dejadas pendientes por el
usuario:** la interpretación de "sin importar filtros" para Destacado
(sección 6.2 del plan), y la dependencia de login real (Fase 1 del
roadmap) que bloquea Destacado/moderación por completo — esta última es
la que manda: aunque 1 y 3 tengan respuesta, no tiene sentido construir
ese código hasta que exista login real.

No se tocó código en esta entrada — solo se actualizó
`plan-monetizacion-admin.md` (secciones 1, 4.2, 6.3, 7) para reflejar
estas decisiones.

## 2026-09-18 — Infraestructura de monetización admin (suscripciones + add-ons)

Ver `plan-monetizacion-admin.md` sección 6 para el diseño completo. Rumbo
aprobado por el usuario el mismo día (sección 6.0 del plan): "Destacado" y
moderación de reportes son un **add-on separado**, no empaquetado dentro
de los tiers Pro/Pro+; la suscripción es **por cuenta AdminCancha**, no
por cancha.

Construido en esta pasada: migraciones `00000000000009`–`00000000000011`
(tablas `suscripciones` y `addons_suscripcion`, función
`vencer_suscripciones_y_addons`), su rollback combinado en
`supabase/rollback/`, `lib/suscripciones.ts` (gating: `nivelDeAcceso`,
`tieneDestacado`, `tieneModeracionReportes`), tipos en
`lib/types/database.ts`, y el cron
`app/api/cron/vencer-suscripciones/route.ts` + entrada en `vercel.json`.
`npx tsc --noEmit` y `npm run lint` limpios.

Dos ajustes sobre el borrador del plan, documentados en detalle en la
sección 6.4 del plan:
- Se agregó una policy de SELECT público en `addons_suscripcion` para
  `destacado` activo — sin ella el listado de búsqueda del Futbolero no
  podría leer qué canchas están destacadas. Es información pública por
  diseño (se muestra como "Patrocinado"), no una relajación riesgosa.
- El kill switch `monetizacion_habilitada` (fail-open) solo aplica a
  `nivelDeAcceso`, no a los add-ons — un bug en el add-on oculta como
  mucho una promoción ya pagada, no bloquea el uso del producto; tratarlo
  igual hubiera marcado a todas las canchas como destacadas al apagarlo.

**Deliberadamente sin tocar todavía** (mismo criterio que ya aplica el
repo — migrar la UI cuando se construye la feature consumidora, no
antes): el `sort` de `ListaCanchas.tsx` no usa `tieneDestacado`, el
dashboard de insights y el botón de reportar comentario no existen. La
interpretación de "sin importar filtros" para "Destacado" (6.2 del plan)
sigue sin confirmar con Pamela — bloquea conectar el gating a
`ListaCanchas.tsx`, no el resto del modelo.

**Actualización 2026-09-18 (mismo día):** el usuario corrió las 3
migraciones (009-011) contra el proyecto Supabase real vía SQL Editor —
las tres reportaron éxito. La base ya tenía 001-008 aplicadas de antes de
esta sesión. A partir de este momento `suscripciones` y
`addons_suscripcion` existen de verdad, con RLS activo — cualquier cambio
futuro a estas tablas necesita una migración nueva, no editar las
009-011 in place.

## 2026-09-16 — Cierre del rediseño Organic (Fases 0-13 de plan-rediseno-dale-cancha.md)

Las 13 fases del rediseño se ejecutaron de corrido en la rama
`rediseno-organic` (D12), un commit por fase, sin push (el usuario decide
el merge a `main` aparte — ver HANDOFF.md). Resumen de cierre:

- **D1-D13** (definidas en la entrada del 2026-09-15 arriba): todas
  resueltas a su default recomendado, sin cambios durante la ejecución.
- **Métricas del panel del admin** (Fase 10): ver la entrada del
  2026-09-16 "Panel del admin" arriba — reservasHoy, ingresosHoy, delta
  vs. ayer, ocupación/rating (reusan `calcularInsights`), horarios de la
  semana por cancha, próximos partidos.
- **Qué quedó fuera de este plan** (documentado como riesgos en la
  sección 6 del plan, ninguno se resuelve acá):
  - R1/R2 (severidad alta): una reserva `creada` no tiene plazo real, y
    el cron de expiración corre 1 vez al día (límite de Vercel Hobby) —
    el copy nuevo de "vence a las HH:MM" en `ReservaEstado`/la cola de
    validaciones es honesto sobre el dato que existe, pero no arregla el
    problema de fondo.
  - R3 (media): la URL firmada del comprobante expira a los 5 minutos;
    si el admin deja la cola de validaciones abierta más tiempo, la
    imagen se rompe sin refresco automático.
  - R4 (alta, conocida): el login sigue sin verificar identidad — la
    piel nueva no cambia ni oculta esto, sigue siendo una vulnerabilidad
    temporal aceptada.
  - R5/R6: sin tests/CI automatizados y sin ambiente de staging — toda
    la verificación de este rediseño fue manual (lint + tsc + revisión
    de código en este sandbox, chequeo visual pendiente en la Mac del
    usuario).
- **Limitación de verificación de esta sesión**: `npm run build` no pudo
  correr en el sandbox donde se ejecutó el plan (proxy de red bloquea
  `fonts.googleapis.com`, ver HANDOFF.md) — cada fase se verificó con
  `npm run lint` + `npx tsc --noEmit` + revisión de código, decisión
  explícita del usuario. La matriz de verificación visual de la sección 8
  del plan (rutas a 390×844 y 1280×832, accesibilidad transversal)
  **queda pendiente**, para correr en un entorno donde `npm run build`/
  `npm run dev` funcionen.
- **Auditoría de grep de la Fase 13**: sin resultados en hex sueltos,
  paleta Tailwind default (zinc/gray/etc.), `bg/text-black`/`white`, y
  clases semánticas sin número (`text-danger`, `fill-warning`). Dos
  hallazgos quedaron, ambos justificados: `components/shared/SlotPicker.tsx`
  usa `toLocaleDateString` sobre un `Date` construido y usado enteramente
  en el cliente (sin el bug de UTC de D11, que es un problema de cómputo
  en el servidor) para un selector de 14 días con forma de datos distinta
  a la de `lib/formato.ts`; y `washed` solo aparece sobre fotos de
  cancha, nunca sobre comprobantes de pago.

## 2026-09-16 — Panel del admin (Fase 10 del rediseño Organic) — definiciones de métrica

Nuevo `lib/admin/panel.ts`, solo lectura. El plan pide dejar estas
definiciones documentadas acá para que no queden implícitas en el código:

- **Reservas hoy:** reservas en estado `confirmada` o `pendiente_validacion`
  cuyo `slot.fecha` es hoy (hora de Costa Rica, vía `hoyCR()`).
- **Ingresos hoy:** suma de `monto` de las reservas `confirmada` (no
  `pendiente_validacion`) cuyo `slot.fecha` es hoy — subtítulo "confirmados"
  en el StatCard, para no confundir con lo que todavía puede rechazarse.
- **Delta de "Reservas hoy" vs. ayer:** `reservasHoy - reservasAyer`, solo
  si existían horarios (`slots`) cargados ayer para alguna cancha del admin
  — si no había horarios ayer, no hay base real de comparación y el delta
  queda `null` (el StatCard no muestra la línea). No se aplica el mismo
  criterio de "reservas" a ayer: se cuentan con el mismo filtro de estado
  (`confirmada`/`pendiente_validacion`) para que la comparación sea
  consistente.
- **Ocupación (7 días) y Rating:** se reusan tal cual de
  `calcularInsights(supabase, canchaIds, 7)` (`lib/insights.ts`, sin
  tocar) — `ocupacionPct`, `ratingPromedio`, `totalCalificaciones`. La
  ocupación no lleva delta: `calcularInsights` no expone el período
  anterior de ocupación, y agregarlo implicaría tocar `lib/insights.ts`,
  fuera del alcance de esta fase.
- **Horarios esta semana (por cancha):** conteo de `slots` con `fecha`
  entre hoy y hoy+6 (7 días, límite `sumarDiasCR(hoy, 6)`), agrupado por
  `cancha_id`. Se muestra en la fila de cada cancha en "Mis canchas"
  ("★ 4.8 · 12 horarios esta semana").
- **Próximos partidos:** hasta 5 reservas `confirmada` con `slot.fecha >=
  hoy`, ordenadas por fecha y hora de inicio ascendente. Sin límite
  superior de fecha (no se acotó a los próximos N días) — en la escala
  actual del producto no es un problema de performance real.

## 2026-09-15 — Rediseño Organic (Turno 2a) — decisiones D1–D13

Ver `plan-rediseno-dale-cancha.md` para el plan completo (secciones 1–4) y
`design_handoff_dale_cancha/` para el handoff de diseño original. Ninguna
decisión se discutió con Julián antes de arrancar la Fase 0, así que se
aplicó el **default recomendado** de cada una, como el plan permite
explícitamente. Si alguna no es la deseada, se puede revertir en la fase
correspondiente sin tocar lógica de negocio.

- **D1 — Pantallas de auth:** piel nueva sobre el flujo actual (correo +
  tarjetas de rol, sin contraseña). `/register` sigue redirigiendo.
- **D2 — Hoja de pago:** dos pasos sobre las rutas existentes
  (`reservar/[slotId]` y `.../comprobante`), sin contador en ningún paso.
- **D3 — Distancia / "Cerca de mí" / dirección:** se omiten. La línea meta
  usa rating + descripción.
- **D4 — Precio en la card:** lectura nueva del mínimo de `slots.precio`
  disponible en los próximos 14 días.
- **D5 — Pestaña Perfil:** página nueva `/futbolero/perfil`, solo lectura.
- **D6 — Navegación del admin:** rutas nuevas `/admin/canchas`,
  `/admin/horarios`, `/admin/mas`.
- **D7 — Contraste de rellenos con texto:** paleta accesible — `--primary`
  = terracota 700 `#8c491a`, "Confirmar reserva" en sage 700 `#56633f`.
  `--brand` (terracota base `#c67139`) queda para acentos sin texto.
- **D8 — Tema:** solo modo claro; se elimina el bloque `.dark` y
  `@custom-variant dark`.
- **D9 — Formatos:** `lib/formato.ts` con `formatearColones` (punto de
  miles) y fechas en `America/Costa_Rica` ("setiembre").
- **D10 — Rampa del heatmap:** ajustada (crema → terracota 300/500/700/900)
  con leyenda "menos → más".
- **D11 — Bug de "hoy" en UTC:** se corrige en la Fase 0.5, antes de la
  Fase 6 (`lib/fecha.ts` → `hoyCR()` / `sumarDiasCR()`).
- **D12 — Rama de trabajo:** rama local `rediseno-organic` (creada en esta
  fase), commits por fase, merge a `main` al final. `main` hace deploy
  automático, así que no hay push intermedio.
- **D13 — Etiqueta "Noche · la más pedida":** se calcula con los slots
  visibles (franja con mayor proporción de `retenido`/`reservado` en 14
  días, con al menos 3 ocupados); sin etiqueta si no hay señal clara.

## 2026-09-15 — Fase 0 de roadmap-producto.md: fotos, amenidades, multi-cancha

- **Info de cancha** (`/admin/canchas/[canchaId]/info`, doc UI/UX 6.4): fotos
  (hasta 8, bucket público `fotos-cancha` ya existía en la migración
  `00000000000004` sin ningún flujo que lo usara) + amenidades (checklist
  fijo de 8 opciones, `lib/amenidades.ts`, guardado como array de strings en
  `canchas.amenidades` jsonb) + los campos que ya existían en el form de
  creación.
- **Selector de cancha** (`components/admin/SelectorCancha.tsx`, doc 6.6)
  en Info y en Horarios — un admin puede tener más de una `Cancha` (SPEC.md
  3.2.1) y hasta ahora no había forma de saltar de una a otra sin volver al
  dashboard. Se oculta solo si el admin tiene una única cancha.
- **Bug real encontrado en el primer intento** (no lo agarra `npm run
  build`, solo se ve en runtime): un Server Component no puede pasar una
  función como prop a un Client Component. `SelectorCancha` originalmente
  recibía un callback `construirHref(id) => string` desde las páginas
  server — rompía con "Functions cannot be passed directly to Client
  Components". Se cambió a pasar un `sufijoRuta: string` y armar el href
  adentro del client component. Detectado recorriendo la app en el
  navegador, no leyendo código — otro recordatorio de por qué el paso de
  verificación manual importa.
- **`SelectValue` de Base UI no resuelve el label solo.** Sin pasarle un
  `children` de tipo función, muestra el `value` crudo (el UUID) en vez del
  nombre de la cancha. Se resolvió con
  `<SelectValue>{(id) => canchas.find(...)?.nombre}</SelectValue>`. Vale
  tenerlo en cuenta para cualquier otro `Select` que se agregue — no es
  automático como uno esperaría viniendo de un `<select>` nativo.
- **Fotos y amenidades del futbolero-facing** (`GaleriaFotos.tsx` — carrusel
  con scroll-snap nativo, sin JS — y `AmenidadesGrid.tsx`) se agregaron a
  `CanchaCard` y al detalle de cancha. Verificado de punta a punta con
  Supabase real: admin sube una foto y marca 2 amenidades → aparece
  inmediatamente en Buscar y en el detalle del lado Futbolero.
- **Landing (`/`) con identidad visual** (`components/CanchaIlustracion.tsx`):
  SVG simple de una cancha en la paleta de la app — no hay fotografía real
  disponible para un hero, esto evita dejar la landing vacía sin depender
  de un asset externo.

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
