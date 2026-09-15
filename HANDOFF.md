# Handoff — sesión del 2026-09-15

> Para el siguiente agente (o para retomar en una sesión nueva). Si esto
> quedó desactualizado porque ya se ejecutó el trabajo pendiente, borrarlo
> o reemplazarlo — no es un documento permanente como SPEC.md/DECISIONS.md,
> es una foto del estado a mitad de tarea.
>
> **Actualización**: el rename a "Dale Cancha" + la limpieza de copy de la
> tabla de abajo ya se ejecutaron y verificaron (build limpio, revisado en
> el navegador, cero errores de consola en tabs nuevas). El resto de este
> documento (estado del proyecto, bugs encontrados, próximos pasos) sigue
> vigente — solo el "objetivo inmediato" de esta sección quedó completado.

## Objetivo inmediato (acordado con el usuario, ya ejecutado y verificado)

Dos tareas simples, aprobadas en la conversación pero sin tocar código aún:

1. **Renombrar la app a "Dale Cancha"** (decidido entre 4 opciones que se le
   presentaron al usuario — ver razonamiento abajo, no volver a discutirlo).
2. **Limpiar "AI slop" de la copy** — lista concreta ya acordada, sin ajustes
   pendientes del usuario.

### Por qué "Dale Cancha" (no re-litigar esto)

Investigué el mercado real (WebSearch) antes de proponer nombre: hay ~10
competidores directos en Costa Rica (Mejengas.com, SuperCancha, Sportico,
MiCanchaCR, Cancha Ya, CONA, iCancha, LaSinte, ATC, joga). La mayoría son
variaciones de "Cancha + algo" — ese patrón ya no diferencia. "Mejenga" se
descartó porque es literalmente el nombre de un competidor real
(Mejengas.com — reserva, organiza equipo, paga con SINPE, casi idéntico a
este producto). "Dale Cancha" es una expresión tica real, no un sustantivo
genérico, y no choca con ningún competidor encontrado en la búsqueda.

### Lista de cambios de copy acordados (ejecutar tal cual, ya revisados)

| Dónde | Texto actual | Cambiar a |
|---|---|---|
| `app/layout.tsx` (metadata title) | "Canchas Fútbol 5 CR" | "Dale Cancha" |
| `app/page.tsx` (h1 landing) | "Canchas Fútbol 5 — Costa Rica" | "Dale Cancha" (revisar si el subtítulo "Reservá tu cancha y pagá por SINPE Móvil, sin vueltas." sigue funcionando debajo del nuevo nombre, probablemente sí) |
| `app/admin/layout.tsx` (nav link) + `app/admin/page.tsx` (h1) | "Dashboard" | "Panel" |
| `app/admin/layout.tsx` (nav link) + `app/admin/insights/page.tsx` (h1) | "Insights" | "Estadísticas" |
| `app/login/LoginForm.tsx` línea ~54 | "AdminCancha" (label del radio) | "Dueño de cancha" — **no tocar** el `value="admin_cancha"` del input ni nada en la base de datos, es solo el texto visible |
| `app/login/LoginForm.tsx` línea ~63-66 | "Si tu email ya tiene una cuenta, entrás con el tipo que ya tenías asignado, aunque elijas otro acá." | Cortar o reducir a una frase muy corta — sobre-explica un caso borde |
| `components/ReservaEstado.tsx` línea ~57 | `` toast.info(`Tu reserva pasó a: ${nueva.estado.replace("_", " ")}`) `` — esto es un **bug real**, no solo de tono: filtra el enum crudo de la base (ej. "pendiente validacion" sin humanizar) | Reusar las etiquetas humanas que ya existen en `EstadoReservaBadge.tsx` (el objeto `CONFIG` ahí tiene `texto` por estado) — hay que exportar ese mapeo o duplicar las 6 líneas, decisión de implementación libre |
| `components/shared/StatCard.tsx` línea ~37 | "% vs período anterior" | "% vs. período anterior" (agregar el punto) o reformular — menor |

Grep para confirmar que no queden más ocurrencias del nombre viejo después:
```bash
grep -rn "Canchas Fútbol 5\|Canchas Fut5" app/ --include="*.tsx" --include="*.ts"
```
(al momento de este handoff solo aparece en los 2 archivos de la tabla — si
el grep post-cambio da resultados, falta algo).

**Después de aplicar los cambios**: `npm run lint`, `npm run build`, probar
en el navegador (Buscar/mobile con la campana de verificación que ya se
usó toda la sesión — ver sección "Cómo verificar" abajo), commitear, y
**preguntar antes de pushear** salvo que el usuario ya haya dicho
explícitamente que empuje — el patrón de esta sesión fue: nunca pushear sin
que lo pida cada vez, aunque haya dado luz verde para ejecutar el cambio.

---

## Estado actual del proyecto

- **Repo**: https://github.com/juliangarro/fut5 (rama `main`, sin PRs — todo
  push directo, decisión ya tomada con el usuario).
- **Deploy**: Vercel, conectado a ese repo, deploy automático en cada push
  a `main`. Plan Hobby (no Pro) — importa para cualquier cosa que necesite
  Vercel Cron (ver DECISIONS.md, el cron de expiración corre 1 vez/día por
  esta limitación, no cada 5 min como se diseñó originalmente).
- **Local**: `/Users/juliangarro/Downloads/canchas-fut5-cr` (el working
  directory real del proyecto — el proyecto original arrancó por error en
  `/Users/juliangarro/Downloads/files`, no confundir).
- **Supabase**: proyecto `pjpfkqfkbqbpjxuulnea`, credenciales reales en
  `.env.local` (gitignored, no se pierden porque están en el filesystem
  local, no en git). **Es el proyecto de producción real**, no hay ambiente
  de staging separado — cualquier prueba manual escribe a la misma base que
  ve el usuario real.
- **Último commit**: `2ae84a3` — ya pusheado y en sync con `origin/main`.
  Working tree limpio al momento de este handoff.
- **Dev server**: se corrió toda la sesión vía `mcp__Claude_Browser`
  `preview_start` con `.claude/launch.json` en
  `/Users/juliangarro/Downloads/files/.claude/launch.json` (nota: quedó en
  el directorio viejo por cómo lo pidió la herramienta, apunta a
  `--prefix /Users/juliangarro/Downloads/canchas-fut5-cr`). Puede que no
  esté corriendo si empieza una sesión nueva — volver a `preview_start`
  con name "dev" si hace falta.

## Qué existe hoy (resumen — el detalle real vive en git log y DECISIONS.md)

Implementado y verificado en producción:
- Modelo de datos completo + RLS + triggers de máquina de estados (Fase
  inicial, antes del UI/UX).
- Login simplificado: email + tipo de cuenta, **sin contraseña, sin
  verificar que el email sea de quien lo escribe** — decisión explícita del
  usuario, documentada como vulnerabilidad temporal aceptada
  (DECISIONS.md). No "arreglar" esto sin que el usuario lo pida.
- Sistema de diseño (shadcn/ui, preset `base-nova`, **Base UI, no Radix** —
  cuidado: no existe `asChild`, es `render={<Link .../>}` +
  `nativeButton={false}`; `Select` no resuelve el label solo, necesita
  `children` función).
- Flujo Futbolero completo: Buscar → Detalle (fotos + amenidades) →
  Resumen/pago → Subir comprobante → Estado en tiempo real → Mis Reservas
  (tabs Activas/Pasadas).
- Flujo AdminCancha: Dashboard multi-cancha → Validaciones (cola global) →
  Insights (ocupación, ingresos, cancelación, rating, clientes recurrentes)
  → Info de cancha (fotos, amenidades, selector multi-cancha) → Horarios.
- `roadmap-producto.md` Fase 0 (look & feel) ejecutada. Fases 1-3
  pendientes.

Documentos vivos en el repo (todos con contexto que un agente nuevo
debería leer antes de tocar código):
- `SPEC.md` — spec funcional original, fuente de verdad del negocio.
- `plan-ui-ux-canchas-fut5-cr.md` — spec de UI/UX.
- `DECISIONS.md` — **el más importante**, registro cronológico de cada
  decisión no obvia y por qué. Leer antes de asumir cualquier cosa rara en
  el código.
- `roadmap-producto.md` — hoja de ruta de producto (Fase 0 hecha, 1-3 no).
- `plan-mejoras.md` — backlog de QA post-Fase-0-3 (ejecutado).
- `plan-mejoras-integral.md` — mismo backlog visto desde 5 lentes (PO, Eng
  Manager, SWE, BA, Usuario) — tiene hallazgos que `roadmap-producto.md` no
  repite (sin staging, sin CI, sin tests, login como vulnerabilidad real,
  no-show no medible, etc.).
- `plan-monetizacion-admin.md` — estrategia de negocio, no ejecutada,
  propuesta para decidir con el usuario.

## Archivos en vuelo / sin commitear

Ninguno. Working tree limpio (`git status` sin salida) al momento de este
handoff. Si al retomar hay cambios sin commitear que no reconocés, correr
`git status` y `git diff` antes de asumir nada — alguien pudo haber seguido
trabajando.

## Intentos fallidos / bugs reales encontrados esta sesión (para no repetirlos)

1. **Server Component pasando una función a un Client Component.**
   `SelectorCancha` recibía `construirHref={(id) => ...}` desde una página
   server — rompe en runtime ("Functions cannot be passed directly to
   Client Components"), **no lo agarra `npm run build`**. Se resolvió
   pasando un string (`sufijoRuta`) y armando el href adentro del client
   component. Lección: cualquier prop de un Server Component a un Client
   Component tiene que ser serializable.
2. **Base UI `Select.Value` no resuelve el label automáticamente** — sin
   pasarle `children` como función, muestra el `value` crudo (el UUID) en
   vez del nombre. Hay que hacer
   `<SelectValue>{(id) => items.find(...)?.label}</SelectValue>`.
3. **`nativeButton` warnings** — cualquier `Button` de shadcn/base-nova que
   renderiza como `<Link>` necesita `nativeButton={false}` explícito además
   de `render={<Link .../>}`, si no tira un warning de accesibilidad en
   consola (visto varias veces, cada vez que se agregó un botón-link nuevo
   se me olvidó una vez).
4. **Vercel Hobby limita Cron Jobs a 1x/día** — el cron de expiración de
   reservas (diseñado para cada 5 min) rompía el deploy. Se bajó a 1x/día
   como stopgap — ver DECISIONS.md, es una degradación real de una garantía
   de negocio (SPEC.md 5.1.9), no solo un detalle técnico.
5. **`.gitignore` con `.env*` nunca dejó commitear `.env.example`** —
   heredado del scaffold de `create-next-app`, nadie lo notó hasta que se
   revisó por qué el archivo plantilla nunca aparecía en `git status`.
6. **Falsa alarma: error de hydration + warning de Checkbox** — aparecían
   en consola y parecían bugs reales, pero eran historial acumulado de
   cientos de Fast Refresh de la sesión (el dev server llevaba horas
   corriendo). Se confirmó reiniciando el server + probando en una tab
   nueva del navegador: cero errores. Lección para la próxima vez que algo
   raro aparezca en consola después de mucho rato de sesión: reiniciar el
   dev server y probar en una tab limpia antes de asumir que es un bug de
   código.
7. **Race condition de doble-reserva**: se verificó (no se "arregló", ya
   funcionaba) disparando dos inserts concurrentes reales contra Supabase
   vía REST API con service role — uno ganó (201), el otro fue rechazado
   por el trigger. Prueba real, no solo lectura de código.

## Cuentas de prueba (proyecto Supabase real, no un sandbox separado)

- Admin real: `juliangarro26@gmail.com` (id `9a2b7bee-271a-4d57-8e4e-ecf9418d18f2`)
  — administra 3 canchas reales ("Cancha los Perlitos", "Cancha La Milpa",
  "Cancha fatima"). Usar esta cuenta para probar cualquier cosa
  multi-cancha.
- Futbolero de prueba: `futbolero.test@example.com`
  (`13ad1a56-7698-4409-a0dd-538007c4ec98`).
- Otro futbolero de prueba: `juli@gmail.com` (`b2128f4a-db14-4bf8-b227-010893755477`)
  — origen desconocido, probablemente de una prueba manual del usuario
  antes de esta sesión.
- Login: solo email, sin contraseña (ver arriba) — entrar con cualquiera
  de estos emails entra directo a esa cuenta.

## Cómo verificar cambios (patrón usado toda la sesión)

1. `npm run lint && npm run build` primero siempre.
2. Dev server vía `mcp__Claude_Browser` `preview_start` (name "dev").
3. Navegar con `navigate` + `computer` (screenshot) — si el pane sale
   "not displayed", usar `read_page`/`get_page_text` en su lugar (el
   usuario tiende a cerrar el panel; no bloquea la verificación).
4. Ojo: todas las tabs del Browser comparten cookies (mismo perfil) — para
   probar dos roles a la vez hay que loguear/desloguear en secuencia, no se
   puede tener Futbolero y AdminCancha simultáneos en tabs distintas sin
   pisarse la sesión.
5. Para simular subir un archivo (no hay acción nativa de upload en esta
   herramienta de navegador): `javascript_tool` inyectando un `File` +
   `DataTransfer` en el `<input type="file">` y disparando eventos `input`
   y `change` — patrón ya usado para comprobantes y fotos de cancha.
6. Nunca pushear sin que el usuario lo pida explícitamente en ese momento
   — pasó varias veces en la sesión que se commiteó y se esperó confirmación
   antes de `git push`.

## Próximos pasos, en orden

1. **Ejecutar el rename + slop fixes de la tabla de arriba** (la tarea
   pendiente de esta sesión).
2. Verificar en navegador (desktop + mobile), confirmar con el usuario, y
   recién ahí preguntar si pushear.
3. Seguir con **Fase 1 de `roadmap-producto.md`**: reglas de horario
   recurrentes (el dolor de activación más grande hoy — crear horarios uno
   por uno es tedioso), editar/borrar cancha y horarios, login real.
4. Considerar los hallazgos cross-lente de `plan-mejoras-integral.md` que
   todavía no tienen dueño: sin tests automatizados, sin staging/CI/
   observabilidad, sin tracking de eventos — ninguno tiene fecha, pero el
   login inseguro y la falta de notificaciones aparecen en 3+ de las 5
   lentes (la tabla de prioridad real está al final de ese archivo).
5. `plan-monetizacion-admin.md` sigue siendo una propuesta sin decisión del
   usuario — no implementar nada de ahí sin confirmar primero.
