# Handoff — sesión del 2026-09-16 (rediseño Organic, Fases 0-13 completas)

> Para el siguiente agente (o para retomar en una sesión nueva). Reemplaza
> el handoff anterior (2026-09-15, rename a "Dale Cancha" — esa tarea ya
> se ejecutó, verificó y pusheó; ver `git log main` si hace falta ese
> historial). Las 13 fases de `plan-rediseno-dale-cancha.md` están
> commiteadas en `rediseno-organic`, pero **sin push a `main` todavía** —
> falta la decisión del usuario sobre el merge. No es un documento
> permanente como SPEC.md/DECISIONS.md.
>
> **Actualización 2026-09-15/16, sesión de QA visual en la Mac del usuario**
> (fuera del sandbox): se corrió `npm run build` y `npm run dev` reales,
> y se recorrió la matriz de la sección 8 del plan (ver esa sección para
> el detalle ruta por ruta). Se encontraron y arreglaron 2 bugs reales:
> (1) `app/futbolero/layout.tsx`/`app/admin/layout.tsx` pasaban íconos de
> `lucide-react` como prop de Server a Client Component, lo que tiraba
> 500 en **todas** las rutas de `/futbolero/*` y `/admin/*` — `BarraInferior`
> ahora resuelve el ícono por string key; (2) a 1280px la cabecera "Dale
> Cancha" se duplicaba en `/futbolero/canchas` (`ListaCanchas.tsx` sin
> `md:hidden`). También se arregló, a pedido explícito del usuario, el
> hallazgo de texto interactivo a 15px en vez de ≥16px (sistémico en
> `button.tsx`/`tabs.tsx`/`ChipFiltro.tsx`/`NavBar.tsx`/`SidebarAdmin.tsx`
> y algunos labels puntuales) — ver sección 8 del plan para el detalle
> completo y el alcance exacto del arreglo.
>
> **Actualización 2026-09-15, sesión aparte — fix de error handling en
> comprobante SINPE (cerrado):** reporte del usuario: al subir el
> comprobante después de reservar, la pantalla "se cerraba" sin ningún
> alert y después aparecía la fecha como ocupada, sin manera de saber si
> la subida había funcionado. Causa real: `ComprobanteUploader` no tenía
> un estado de éxito propio — dependía de que el padre navegara
> (`onExito`) o de que llegara el evento realtime de `reservas.estado`
> para reflejar la subida, y si eso tardaba el botón quedaba congelado en
> "Enviando…" sin avisar nada. De paso se detectaron y arreglaron 2 huecos
> más en el mismo camino: el `fetch` de subida no tenía timeout (podía
> colgarse indefinido con conexión inestable) y `cancelarReserva` en
> `ReservaEstado.tsx` podía lanzar sin que nadie lo capturara si el estado
> cambiaba mientras el diálogo de confirmación estaba abierto. Arreglado en
> `components/shared/ComprobanteUploader.tsx` y
> `components/ReservaEstado.tsx`, rama `fix/comprobante-sinpe-estados` →
> PR #1 → **mergeado a `main` y pusheado** (`dfea63e`). El usuario hizo el
> deploy real y confirmó visualmente que se ve bien. Sin tareas pendientes
> de este hilo.

## Qué se está haciendo

Ejecutando `plan-rediseno-dale-cancha.md` de punta a punta: migración del
sistema visual de verde/Inter a un sistema "Organic" (crema/arena/
terracota/sage, fuente Figtree, componentes en píldora). El plan tiene 13
fases (0 a 13), cada una con su propio commit en la rama `rediseno-organic`
(creada desde `main` en la Fase 0, D12). **Ninguna fase toca lógica de
negocio** — solo UI, salvo lecturas nuevas (`select`) explícitamente
anotadas en cada commit.

El usuario aprobó ejecutar todo el plan de corrido ("Sigamos, viento en
popa"), fase por fase, sin pausas de revisión entre cada una, con esta
verificación por fase (decisión explícita del usuario, ver abajo):
`npm run lint` + `npx tsc --noEmit` + revisión de código — **no**
`npm run build`, ver limitación de sandbox abajo. El chequeo visual real
(`npm run build`/`npm run dev`, pantallas a 390×844 y 1280×832, nav por
teclado) queda para el usuario en su Mac, fuera de este sandbox, cuando
quiera.

**Nunca hacer `git push`** sin que el usuario lo pida explícitamente en
ese momento — ninguna fase de este trabajo se pusheó todavía, todo vive
en commits locales de `rediseno-organic`.

## Estado actual

- [x] **Fase 0** — decisiones D1-D13 resueltas a su default, documentadas
  en `DECISIONS.md`. Rama `rediseno-organic` creada. Commit `9f31424`.
- [x] **Fase 0.5** — bug de "hoy" en UTC (D11): `lib/fecha.ts`
  (`hoyCR()`/`sumarDiasCR()`), aplicado en las 2 pantallas que ya
  calculaban fechas. Commit `4f45a4a`.
- [x] **Fase 1** — tokens base: `app/globals.css` reescrito (paleta
  Organic, radios con nombre, sin `.dark`), `app/layout.tsx` con Figtree,
  `sonner.tsx` sin `next-themes`. Commit `ca5ebb8`.
- [x] **Fase 2** — primitivos shadcn/ui reestilizados (button, input,
  textarea, card, badge, tabs, dialog, select, checkbox, radio-group,
  skeleton, label) + componentes compartidos nuevos (`Marca`,
  `BotonVolver`, `Aviso`, `ChipFiltro`, `HojaInferior`,
  `BarraAccionInferior`, `ContadorExpiracion`, `FotoCancha`, `Avatar`) +
  `lib/formato.ts` (D9). Commit `71ca7c4`.
- [x] **Fase 3** — navegación: `BarraInferior` (mobile), `SidebarAdmin`,
  `NavBar` reescrito, perfil futbolero (D5), rutas admin nuevas (D6:
  `/admin/canchas`, `/admin/horarios`, `/admin/mas`),
  `lib/admin/contarPendientes.ts`. Commit `32a621a`.
- [x] **Fase 4** — pantalla de entrada + login (D1: piel nueva sobre el
  flujo sin contraseña, tarjetas de rol). Commit `07e25e9`.
- [x] **Fase 5** — buscador de canchas: filtros por amenidad, orden,
  precio-desde (D4), `CanchaCard`. Commit `15de52e`.
- [x] **Fase 6** — detalle de cancha: galería full-bleed, horarios
  agrupados por franja con "la más pedida" (D13, `lib/franjas.ts`).
  Commit `77551c6`.
- [x] **Fase 7** — pago SINPE en hoja inferior de 2 pasos (D2, sin
  contador), `ComprobanteUploader` reestilizado sin tocar la lógica de
  subida/reintentos. Commit `85295ed`.
- [x] **Fase 8** — estado de la reserva: `EstadoReservaBadge` +
  `TONO_ESTADO_RESERVA`, cabecera tintada con línea de tiempo de 3 pasos,
  copy "qué sigue" honesto (usa `expira_at`, nunca promete un tiempo de
  respuesta). Bug propio detectado y corregido en el camino: agregar
  `formatearHoraDeTimestamp` a `lib/formato.ts` (con `timeZone:
  "America/Costa_Rica"`) porque mostrar `expira_at`/`comprobante_subido_at`
  con `new Date(...).toISOString()` da la hora en UTC, no en CR — mismo
  bug que D11. Commit `82e6ee6`.
- [x] **Fase 9** — Mis reservas (tabs Activas/Pasadas, línea "qué sigue"
  en la fila, `hora_fin` como lectura nueva). Commit `763232f`.
- [x] **Fase 10** — Panel del admin (`lib/admin/panel.ts` nuevo, banner,
  4 StatCards, próximos partidos). Commit `1e55123`.
- [x] **Fase 11** — Cola de validaciones (filtro por cancha, expandir
  primer ítem). Commit `510ca70`.
- [x] **Fase 12** — Estadísticas (heatmap D10, gráfico de ingresos).
  Commit `49ee223`.
- [x] **Fase 13** — Barrido final: pantallas sin diseñar heredan tokens,
  greps de auditoría (hex sueltos, paleta Tailwind default, texto <16px,
  `toLocaleDateString` residual, `render={<Link` sin `nativeButton`,
  `washed` en comprobantes — todas en 0 resultados o justificadas),
  cierre de `DECISIONS.md`/este handoff. **Lo único que falta de la
  Fase 13**: recorrer la matriz de verificación visual de la sección 8
  del plan (bloqueada en este sandbox) y preguntarle al usuario sobre
  el merge a `main` y el push — ver "Próximos pasos" abajo.

El detalle de qué cambió en cada fase (archivos, decisiones de
implementación no explícitas en el plan) vive en los mensajes de commit
de `rediseno-organic` — `git log rediseno-organic` es la fuente de verdad
fase a fase, más confiable que resumir todo acá.

**Checkboxes del plan** (`plan-rediseno-dale-cancha.md`): todavía no se
fueron marcando `[x]` a medida que se completa cada fase (quedó como
deuda de la sesión anterior a este handoff) — pendiente hacerlo, al menos
retroactivamente para las Fases 0-8, antes de cerrar el trabajo.

## Limitación real de este sandbox (no es un bug del código)

`npm run build` no completa en el sandbox de Linux donde corre este
agente: `next/font/google` (Figtree) intenta bajar de
`fonts.googleapis.com` y el proxy de red del sandbox lo bloquea (`curl -v`
→ `403` con header `X-Proxy-Error: blocked-by-allowlist`; `registry.
npmjs.org` sí funciona). Afecta a `main` también, no es algo que esta
rama haya roto. El usuario decidió explícitamente (no volver a
preguntarlo) seguir con lint+tsc+revisión de código como verificación acá,
y correr `npm run build`/`npm run dev` él mismo en su Mac cuando quiera
ver el resultado real.

Nota aparte, ya resuelta y no relevante para el siguiente agente salvo que
alguien reinstale dependencias desde cero en este mismo sandbox: hubo que
`npm install --no-save @next/swc-linux-arm64-gnu@16.3.5` para que el build
llegara siquiera hasta el bloqueo de fonts (el binario nativo instalado
por default es para macOS ARM64). No se persistió en `package.json`/
`package-lock.json`.

## Reglas duras del plan (no romper sin que el usuario lo pida)

- No tocar `app/**/actions.ts`, `app/api/**`, `supabase/migrations/**`,
  `proxy.ts`, `lib/supabase/**`, ni la máquina de estados de `Reserva`.
  Lecturas nuevas (`select`) sí están permitidas, anotadas en el commit.
- Cero hex sueltos fuera de `app/globals.css` (excepción: el literal de
  `themeColor` en el `viewport` de `app/layout.tsx`).
- Base UI, no Radix: botón-como-link necesita `render={<Link .../>}` **y**
  `nativeButton={false}`; `SelectValue` necesita `children` como función.
- Solo props serializables de Server a Client Components.
- Mínimos de accesibilidad: texto interactivo ≥16px (11-13px solo en
  kickers/metadata), objetivos táctiles ≥44×44px, cada estado de reserva
  con color+ícono+texto juntos, foco visible (`outline: 2px`,
  `outline-offset: 2px`).
- `washed` en fotos de cancha, **nunca** en comprobantes de pago.
- Nunca mostrar el valor crudo del enum de estado — siempre
  `ETIQUETA_ESTADO_RESERVA`.

## Estado del repo / entorno

- **Local**: `/Users/juliangarro/Downloads/canchas-fut5-cr` (conectado a
  este agente vía bridge de dispositivo — carpeta `Downloads` autorizada).
- **Rama actual**: `rediseno-organic`, sin push. `main` sigue como estaba
  antes de esta sesión (rename "Dale Cancha" ya pusheado previamente).
- **Supabase**: proyecto real de producción (mismo que documenta el
  handoff anterior) — cualquier prueba manual de este rediseño (login,
  reservar, subir comprobante) escribe ahí, no hay ambiente de staging.
- Identidad de git configurada localmente en este sandbox (no global):
  `user.name "juliangarro"`, `user.email` con el noreply de GitHub que ya
  usaban los commits existentes.

## Documentos vivos relevantes

- `plan-rediseno-dale-cancha.md` — el plan que se está ejecutando ahora,
  fuente de verdad de qué falta.
- `DECISIONS.md` — registro de D1-D13 (esta sesión) + decisiones previas.
- `design_handoff_dale_cancha/` — handoff de diseño original (paleta,
  componentes, referencia visual) que originó el plan.
- El handoff de 2026-09-15 (rename + hallazgos de la sesión anterior,
  cuentas de prueba, simulación de producción) — su contenido histórico
  sigue siendo válido pero ya no está en este archivo; recuperarlo de
  `git log -p -- HANDOFF.md` si hace falta.

## Próximos pasos

1. ~~Chequeo visual real en la Mac del usuario~~ — hecho el 2026-09-15/16,
   ver la actualización arriba y la sección 8 del plan para el detalle.
   Quedan sin verificar por falta de datos de prueba: los 4 estados de
   comprobante que requieren subir un archivo real (herramienta de
   navegador no puede automatizar file picker), los estados
   `pendiente_validacion`/`rechazada`/`cancelada`/`vencida` de una
   reserva, el banner del admin "con pendientes"/"vencido", y el heatmap
   de insights con datos reales (no hay reservas confirmadas suficientes
   en el rango). VoiceOver tampoco es verificable desde ese entorno.
2. **Preguntarle al usuario** si hace merge de `rediseno-organic` a
   `main` y si empuja — no se hizo ni se preguntó todavía en esta
   sesión. `main` sigue como estaba antes de este rediseño. También
   preguntar si quiere arreglar el hallazgo de texto interactivo a 15px
   (ver sección 8) antes o después del merge, dado que es sistémico.
3. Si el merge se pide: revisar que no haya conflictos con cambios que
   hayan entrado a `main` en paralelo (no debería, pero no se verificó
   en esta sesión), mergear, y recién ahí `git push` — nunca antes de
   que el usuario lo pida explícitamente en ese momento.
4. Los riesgos R1-R6 de la sección 6 del plan (ver también el cierre en
   DECISIONS.md del 2026-09-16) siguen sin resolver — ninguno se tocó en
   este rediseño a propósito, son decisiones de producto/negocio
   separadas, no de este trabajo visual.
