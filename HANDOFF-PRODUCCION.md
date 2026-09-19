# Handoff — pase a producción (sesión UAT + fix de bugs, 2026-09-18/19)

> Para el siguiente agente (o para retomar en una sesión nueva) y para el
> humano a cargo del deploy. Documento de esta sesión específica — no
> permanente como `SPEC.md`/`DECISIONS.md`; se puede archivar una vez
> mergeado a `main` y desplegado, igual que `HANDOFF-TESTING.md`.

## Qué se hizo

1. UAT completo (manual, vía Chrome real, + suite Playwright) de todos los
   caminos de Futbolero y AdminCancha. Reporte completo entregado como
   `UAT-Report-Dale-Cancha.md` (fuera del repo, enviado al usuario).
2. Se ampliaron los specs Playwright de 2 a 7 (2 caminos dorados
   preexistentes + 5 nuevos escritos esta sesión).
3. Se encontraron 3 bugs. **Los 3 están arreglados y verificados en esta
   sesión** (código + Playwright en verde de forma determinística, no solo
   por casualidad de horario — ver detalle abajo).
4. Suite Playwright completa: **8/8 verdes**, corrida repetida hasta
   confirmar que no depende de la hora del día en que se ejecute.

## Los 3 bugs — causa, fix, verificación

### 1. HIGH — Slot liberado desaparece del picker del futbolero (bug de zona horaria)

- **Archivo:** `components/shared/SlotPicker.tsx`
- **Causa:** el server (`app/futbolero/canchas/[canchaId]/page.tsx`) calcula
  "hoy" correctamente con `hoyCR()` (zona horaria Costa Rica, ver
  `lib/fecha.ts`), pero el componente cliente `SlotPicker` recalculaba su
  propio "hoy" con `new Date()` del browser. Cuando el reloj/zona horaria del
  navegador y el calendario real de Costa Rica no coinciden (típicamente
  después de las 6pm hora CR), la ventana de 7 días de tabs se corría un día
  y un slot real y disponible dejaba de mostrarse — sin ningún error visible.
- **Fix:** `SlotPicker` ahora recibe `hoyISO` como prop desde el server (que
  ya calculaba `hoyCR()` — solo faltaba pasarlo) en vez de recalcularlo. Toda
  la lógica interna de fechas (`diferenciaDias`, `formatearDia`, generación
  de los 7 días con `sumarDiasCR`) opera sobre strings `YYYY-MM-DD`, nunca
  sobre `Date` del navegador; el único uso de `Date` es para mostrar nombre y
  número de día, anclado a mediodía UTC para no cruzar un borde de DST/zona
  horaria.
  - `app/futbolero/canchas/[canchaId]/page.tsx`: pasa `hoyISO={hoy}` (la
    variable `hoy` ya existía en ese archivo, calculada con `hoyCR()`).
  - `e2e/helpers/db.ts`: `fechaEnDias()` tenía el mismo bug (calculaba
    "mañana" con `new Date()` del browser); reescrito para ser CR-timezone-
    aware igual que `hoyCR()`/`sumarDiasCR()`. Esto también hace más
    confiable cualquier otro spec que siembre datos cerca de la
    medianoche CR.
- **Verificado:** `tsc --noEmit` limpio + reproducción en vivo (screenshot
  antes/después) + `e2e/futbolero-cancelar-reserva.spec.ts` en verde de forma
  repetida (antes del fix, este test era dependiente de la hora del día en
  que corriera — ya no).

### 2. MEDIUM — Label del day-tab seleccionado se vuelve invisible

- **Archivo:** `components/shared/SlotPicker.tsx`
- **Causa:** conflicto de cascada CSS. La variante `"line"` del `Tabs`
  compartido (`components/ui/tabs.tsx`) fuerza `data-active:bg-transparent`
  para tabs estilo subrayado. `SlotPicker` pisaba eso con sus propias clases
  `data-active:bg-primary data-active:text-primary-foreground` vía
  `className`, pero sin `!important` el fondo transparente de la variante
  ganaba la cascada (el color de texto sí ganaba, por eso el texto quedaba
  literalmente invisible sobre un fondo transparente en vez de sobre la
  píldora terracota esperada). Confirmado con `getComputedStyle()` en vivo
  (`background-color: rgba(0,0,0,0)` vs. el texto sí coloreado).
- **Fix:** se usó el modificador `!` de Tailwind, **solo en `SlotPicker.tsx`**
  (`data-active:!bg-primary data-active:!text-primary-foreground
  data-active:!shadow-none data-active:after:opacity-0`) en vez de tocar
  `components/ui/tabs.tsx`, que es compartido por otras pantallas — cambio de
  bajo radio de impacto.
- **Verificado:** reproducción en vivo, screenshot antes (hueco en blanco
  donde debía decir "Mañana 20") / después (píldora terracota sólida con la
  etiqueta correcta).

### 3. LOW — CSV export no fuerza descarga para admin con cero canchas

- **Archivo:** `app/api/insights/exportar/route.ts`
- **Causa:** la rama de respuesta para un admin sin canchas (early return)
  devolvía el mismo CSV que la rama normal pero sin el header
  `Content-Disposition: attachment`, así que el navegador mostraba el CSV
  como texto plano en vez de descargarlo.
- **Fix:** se agregó el mismo header `Content-Disposition: attachment;
  filename="reservas_${desde}_a_${hasta}.csv"` a esa rama.
- **Verificado:** `e2e/admin-insights.spec.ts` asertando el response HTTP
  directamente (`page.request.get()` + status 200 + header
  `content-disposition` + primera línea del CSV) — se abandonó
  `page.waitForEvent("download")` por poco confiable contra este dev server
  (ver nota de testing abajo), lo cual de paso destapó que el locator
  `getByRole("link", { name: "Exportar CSV" })` nunca resolvía porque el
  primitivo `Button` de `base-ui` fuerza `role="button"` aunque el DOM
  renderizado sea un `<a href>`.

## Suite Playwright — estado final: 8/8, determinístico

```bash
cd canchas-fut5-cr
npx supabase start        # una vez
npx playwright test e2e/
```

Specs (2 preexistentes + 5 nuevos esta sesión):
- `reserva-futbolero.spec.ts` (preexistente)
- `admin-confirma-comprobante.spec.ts` (preexistente, nombre aproximado)
- `futbolero-cancelar-reserva.spec.ts` — nuevo, cubre bug #1 (cancelar antes
  de pagar + slot liberado vuelve a ser reservable por otro usuario)
- `admin-rechazar-comprobante.spec.ts` — nuevo, rechazo con motivo
- `futbolero-mis-reservas-perfil.spec.ts` — nuevo, estado vacío + perfil +
  logout
- `admin-crear-cancha-y-slot.spec.ts` — nuevo, creación de cancha → slot →
  logout
- `admin-insights.spec.ts` — nuevo, smoke test de las 3 ventanas de tiempo +
  export CSV

Notas de testing para el siguiente agente:
- `page.waitForEvent("download")` no es confiable contra este dev server
  (Turbopack) — la misma request se reportaba a veces como 200 y a veces
  como un 503 sintético del lado del browser tooling, mientras el log real
  del dev server mostraba 200 siempre. Preferir `page.request.get()` +
  asserts directos sobre la respuesta HTTP cuando el test es sobre una
  descarga.
- Componentes de `base-ui` (`components/ui/button.tsx`) fuerzan
  `role="button"` en el árbol de accesibilidad aunque el elemento DOM
  renderizado sea un `<a href>` (vía `render={<Link .../>}`). Usar
  `getByRole("button", ...)`, no `getByRole("link", ...)`, para estos casos.
- Varios `strict mode violation` de Playwright por locators ambiguos
  (nombre de cancha matcheando tanto el `<h1>` como el route-announcer de
  Next.js; "Canchas"/"Salir" existiendo tanto en el nav como en contenido de
  página; texto de stat-label matcheando también copy descriptivo). Se
  resolvieron acotando con `{ exact: true }`, `getByRole("heading", ...)`, o
  scoping a `main`/`list`.

## Otras herramientas dejadas en el repo

- `dev-local.sh` (raíz, ejecutable) — corre `next dev` forzando las env vars
  de Supabase **local**, sin importar lo que diga `.env.local` (que apunta a
  producción por defecto). Usar esto en vez de `npm run dev` en desarrollo
  día a día para evitar tocar producción por accidente — ver nota de
  seguridad abajo.

## Nota de seguridad — antes de mergear/desplegar

Durante esta sesión, `npm run dev` corrió contra la base de **producción**
(`.env.local` → `https://pjpfkqfkbqbpjxuulnea.supabase.co`) al menos 3 veces
por parte del usuario (cada vez detectado y detenido dentro de una carga de
página, nunca hubo una escritura real contra producción salvo un login de
prueba). Antes de dar por cerrado el ciclo de esta sesión:

- [ ] Confirmar en el dashboard de Supabase (producción) → Authentication →
      Users que la cuenta de prueba `uat.futbolero@example.com` fue borrada.
- [ ] Considerar mover `.env.local` a apuntar a local por defecto, y usar un
      archivo separado (`.env.production.local`, gitignoreado) solo cuando
      se quiera apuntar a producción a propósito — para que `npm run dev`
      "pelado" nunca vuelva a tocar producción sin querer. No implementado
      todavía; `dev-local.sh` es el parche inmediato.

## Estado de git — falta un PR antes de "producción"

Todo el trabajo de esta sesión (y de la sesión de `HANDOFF-TESTING.md`) está
en la rama `test/fases-1-6-testing-infra`, **no en `main`**. `origin` es
`https://github.com/juliangarro/fut5.git`.

Archivos modificados (código de la app):
- `app/api/insights/exportar/route.ts` — fix bug #3
- `app/futbolero/canchas/[canchaId]/page.tsx` — pasa `hoyISO` a `SlotPicker`
- `components/shared/SlotPicker.tsx` — fix bugs #1 y #2
- `e2e/helpers/db.ts` — fix timezone en `fechaEnDias()`
- `DECISIONS.md` — nueva entrada de esta sesión (ver abajo)

Archivos nuevos (no trackeados todavía):
- `dev-local.sh`
- `e2e/admin-crear-cancha-y-slot.spec.ts`
- `e2e/admin-insights.spec.ts`
- `e2e/admin-rechazar-comprobante.spec.ts`
- `e2e/futbolero-cancelar-reserva.spec.ts`
- `e2e/futbolero-mis-reservas-perfil.spec.ts`
- `UAT-JOURNEYS.md`
- `HANDOFF-PRODUCCION.md` (este archivo)

**Antes de mergear a `main`**, revisar y probablemente limpiar (no
pertenecen al PR de producción):
- `playwright-output.txt`, `playwright-output2.txt` — scratch de debugging
  de esta sesión, no deberían commitearse.
- `comprobante-uat.png` — screenshot de UAT, evaluar si vale la pena
  guardarlo (por ejemplo en una carpeta de evidencia) o borrarlo.
- `.claude/`, `"Claude outputs/"` — carpetas de tooling de agentes, evaluar
  si deberían estar en `.gitignore` en vez de trackeadas.
- `COMPONENTES-TECNICOS-REAL.md` — verificar si es contenido nuevo genuino o
  un duplicado/borrador de `SPEC.md`/`plan-*.md` existentes.

## Checklist pre-deploy sugerido

- [ ] Abrir PR de `test/fases-1-6-testing-infra` → `main`, con este
      documento y `UAT-Report-Dale-Cancha.md` como contexto de review.
- [ ] Confirmar que las migraciones SQL de este slice sí se corrieron contra
      la base de producción real en algún punto — `DECISIONS.md` (7)
      documenta un bug crítico anterior (404 en detalle de reserva) causado
      justo por una migración de cobro grupal nunca aplicada a producción.
      Vale la pena una verificación explícita de `supabase migration list`
      contra el proyecto de producción antes de este deploy también.
- [ ] Correr `npx supabase test db`, `npx vitest run` y
      `npx playwright test e2e/` una vez más contra el estado final de la
      rama antes de abrir el PR (esta sesión solo corrió Playwright
      repetidamente; pgTAP y vitest no se re-corrieron después de los fixes
      de esta sesión, aunque ninguno de los 3 bugs toca las capas que esos
      tests cubren).
- [ ] Verificar variables de entorno de producción (Vercel u hosting que se
      use) — que apunten al proyecto Supabase de producción real y no
      reutilicen ningún valor local.
- [ ] Borrar la cuenta de prueba de producción (ver checklist de seguridad
      arriba) si no se hizo todavía.

## Relación con `UAT-Report-Dale-Cancha.md`

Ese reporte (entregado antes de esta sesión de fixes) documenta los 3 bugs
como **abiertos**. Este documento los reemplaza como fuente de verdad sobre
su estado: los 3 están **cerrados y verificados** a la fecha de este
handoff. El UAT report sigue siendo válido como registro de qué se probó y
cómo (la matriz de journeys A1–B7).
