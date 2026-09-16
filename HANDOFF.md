# Handoff — sesión del 2026-09-16 (rediseño Organic, en curso)

> Para el siguiente agente (o para retomar en una sesión nueva). Reemplaza
> el handoff anterior (2026-09-15, rename a "Dale Cancha" — esa tarea ya
> se ejecutó, verificó y pusheó; ver `git log main` si hace falta ese
> historial). Esta es una foto a mitad de tarea del rediseño visual, se
> irá actualizando fase a fase mientras avanza — no es un documento
> permanente como SPEC.md/DECISIONS.md.

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

## Estado de las fases (2026-09-16, sesión en curso)

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
- [ ] **Fase 9** — Mis reservas (tabs Activas/Pasadas, línea "qué sigue"
  en la fila, `hora_fin` como lectura nueva). **Próximo paso.**
- [ ] **Fase 10** — Panel del admin (`lib/admin/panel.ts` nuevo, banner,
  4 StatCards, próximos partidos).
- [ ] **Fase 11** — Cola de validaciones (filtro por cancha, expandir
  primer ítem).
- [ ] **Fase 12** — Estadísticas (heatmap D10, gráfico de ingresos).
- [ ] **Fase 13** — Barrido final: pantallas sin diseñar heredan tokens,
  greps de auditoría (hex sueltos, paleta Tailwind default, texto <16px,
  `toLocaleDateString` residual, `render={<Link` sin `nativeButton`,
  `washed` en comprobantes), cierre de `DECISIONS.md`/este handoff,
  preguntar al usuario sobre merge a `main` y push.

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

## Próximo paso concreto

Fase 9 — Mis reservas: `app/futbolero/reservas/page.tsx`,
`ListaReservas.tsx`, `loading.tsx`. Agregar `hora_fin` al select de
`slots` (lectura nueva), tabs en píldora Activas/Pasadas, filas con
`EstadoReservaBadge` + línea "qué sigue" (14px, solo en
`pendiente_validacion` y `creada`), estados vacíos sin cambios de copy,
skeleton nuevo. Ver el texto completo de la fase en
`plan-rediseno-dale-cancha.md` (sección "Fase 9").
