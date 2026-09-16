# Plan maestro — Rediseño de UI "Dale Cancha" (sistema Organic, Turno 2a)

> **Audiencia: Claude Code**, en sesiones sucesivas (una fase por sesión). **Fuente del diseño:** `design_handoff_dale_cancha/` (README.md, `Dale Cancha.dc.html`, `organic-styles.css`, PROMPT.md).
>
> Este plan **reconcilia el handoff con el código real**. El handoff se escribió sin mirar el repo y asume cosas que no son ciertas (login con contraseña, un contador de retención al crear la reserva, distancia por geolocalización, rutas que no existen). El código se auditó el 2026-09-15 sobre el commit `6dd66d1`. **Cuando el README del handoff y este documento no coinciden, manda este documento.** Cuando este documento no dice nada, manda el README del handoff.

---

## 0. Cómo usar este plan

### 0.1 Prompt de arranque (pegar al inicio de cada sesión de Claude Code)

```text
Vamos a ejecutar la Fase <N> de plan-rediseno-dale-cancha.md, y solo esa.

Antes de tocar código leé, en este orden:
1. AGENTS.md (Next 16 tiene cambios incompatibles; los docs están en node_modules/next/dist/docs/).
2. plan-rediseno-dale-cancha.md completo: secciones 1 a 4 y la Fase <N>.
3. design_handoff_dale_cancha/README.md: la sección de la pantalla que toca esta fase.
4. HANDOFF.md, secciones "Intentos fallidos" y "Cómo verificar cambios".
5. En design_handoff_dale_cancha/Dale Cancha.dc.html, el bloque "<!-- 2a · ... -->" de la
   pantalla (leé el código fuente; los estilos inline son la especificación).

Después resumime en 5 líneas qué vas a cambiar y confirmá que las decisiones de la
sección 2 que afectan esta fase están resueltas. Si alguna dice "pendiente", preguntame.

Al terminar: npm run lint, npx tsc --noEmit y npm run build sin errores; verificación
visual a 390px y a 1280px; commit con el mensaje sugerido por la fase; marcá los
checkboxes de la fase en este plan. No hagas push.
```

### 0.2 Reglas duras (valen para todas las fases)

1. **No cambiar lógica de negocio ni esquema.** No tocar: `app/**/actions.ts`, `app/api/**`, `supabase/migrations/**`, `proxy.ts`, `lib/supabase/**`, ni la máquina de estados de `Reserva`. Sí se permiten **lecturas nuevas** (`select`) en Server Components cuando una pantalla muestra un dato que hoy no se trae. Cada lectura nueva se anota en el commit. La única excepción posible es D11, y solo si Julián la aprueba.
2. **Sin hex sueltos.** Los valores de color viven solo en `app/globals.css`. Única excepción: `themeColor` en `export const viewport` de `app/layout.tsx`, que exige un literal.
3. **Base UI, no Radix** (HANDOFF.md): no existe `asChild`. Un botón que es link se escribe `render={<Link …/>}` **más** `nativeButton={false}`. `SelectValue` necesita `children` como función para mostrar el label.
4. **Props de Server a Client Component: solo datos serializables.** Nada de callbacks (HANDOFF.md, intento fallido #1; `npm run build` no lo detecta).
5. **Mínimos de accesibilidad** (`plan-ui-ux-canchas-fut5-cr.md` 1.2 y 2.6):
   - 16px mínimo en texto interactivo; 11–13px solo en kickers y metadatos.
   - Área táctil de 44×44px como mínimo.
   - Cada estado de reserva se comunica con color, ícono y texto juntos.
   - Foco visible con `outline: 2px` y `outline-offset: 2px`.
6. **Fotos de cancha con tratamiento `washed`. Comprobantes nunca.** El filtro baja el contraste y el admin necesita leer el monto.
7. **Nunca mostrar el valor crudo de un enum.** Usar siempre `ETIQUETA_ESTADO_RESERVA`.
8. **No hacer push** sin que Julián lo pida en ese momento. Todas las pruebas manuales escriben en la base de producción: ver sección 7.

### 0.3 Definición de "hecho" por fase

- `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.
- Las pantallas de la fase se revisaron a 390×844 y a 1280×832 con el dev server. HANDOFF.md explica el método: `preview_start`, `read_page` o captura.
- Se probó el teclado: Tab recorre todo, el foco se ve y Esc cierra hojas y diálogos.
- Hay un commit con el mensaje sugerido.
- Los checkboxes de la fase están marcados en este archivo.

---

## 1. Diferencias entre el handoff y el repo (leer antes de empezar)

| # | Qué asume el handoff | Qué hay en el repo | Cómo lo resuelve este plan |
|---|---|---|---|
| 1 | "Entrar" pide correo y contraseña, hay "Olvidé mi contraseña" y "Crear cuenta" pide nombre, correo y contraseña | Login simplificado: correo más tipo de cuenta, sin contraseña (`app/login/actions.ts` → `entrar`). `/register` redirige a `/login`. DECISIONS.md lo marca como temporal y HANDOFF.md dice "no arreglar sin que el usuario lo pida" | La piel nueva se aplica **al flujo actual**. Ver D1 |
| 2 | "Continuar" crea la `Reserva` y abre la hoja de pago con un contador de retención ("29:41") | La `Reserva` se crea recién en `confirmarPago`, al tocar "Ya pagué" (decisión 5.4: mirar el resumen no retiene el horario). `expira_at` se calcula **solo al subir el comprobante** (trigger `sincronizar_estado_reserva`). **Una reserva `creada` no tiene plazo** | Hoja en dos pasos sobre las rutas actuales, sin contador en la hoja. Ver D2 y R1 |
| 3 | "Vence en 12 min… Si no respondés, el horario se libera solo" | El cron de expiración corre **una vez al día** (Vercel Hobby, DECISIONS.md). Una reserva vencida puede quedar retenida hasta 24 h | El contador se muestra, porque `expira_at` es el plazo real, pero el copy no promete que la liberación sea inmediata. Ver R2 |
| 4 | Chip "Cerca de mí", distancia ("1,2 km") y dirección ("Mata Redonda, San José") | `canchas.ubicacion` es `geography`, pero no hay RPC de distancia, ni geolocalización, ni una dirección en texto | Sin distancia ni dirección. La línea meta usa la descripción, que es el fallback que el README permite. Ver D3 |
| 5 | Precio en la card de búsqueda | `app/futbolero/canchas/page.tsx` no trae precio. `CanchaCard` ya acepta `precioDesde`, pero nadie se lo pasa | Lectura nueva del precio mínimo disponible. Ver D4 |
| 6 | Pestaña "Perfil" en la barra inferior | No existe `/futbolero/perfil`. "Salir" vive en `NavBar` | Página mínima nueva. Ver D5 |
| 7 | Sidebar del admin con "Horarios" y "Canchas"; en mobile, "Más" | No existen `/admin/canchas` (índice) ni un índice de horarios | Rutas nuevas, solo de navegación y lectura. Ver D6 |
| 8 | Panel del admin con 4 StatCards del día, "Próximos partidos" y "N horarios esta semana" | El panel actual solo muestra el conteo de pendientes y la lista de canchas | Lecturas nuevas (Fase 10). Las definiciones de cada métrica quedan en DECISIONS.md |
| 9 | "Abrí `Dale Cancha.dc.html` en el navegador" | El HTML referencia `./support.js`, `./image-slot.js` y `_ds/…/styles.css`, que no vienen en el bundle, así que se ve a medias | Leer el **código fuente** del HTML. Las clases `.btn`, `.input` y `.tag` están en `organic-styles.css`. No implementar los frames del Turno 1 (`1a`/`1b`/`1c`) ni el bloque de demo "Cómo se ven los otros estados" |
| 10 | "Colores definitivos": botón primario con texto crema sobre `#c67139` | **3.03:1** medido. Falla WCAG AA (4.5:1), porque 17px/700 no cuenta como texto grande (hace falta ≥18.66px en negrita). Pasa lo mismo con chips activos, slot seleccionado, ítem activo del sidebar y "Confirmar reserva" (crema sobre sage 600: 3.53:1) | Ver D7 y la sección 3 |
| 11 | Bordes con divider al 16% e inputs arena sobre crema | Divider sobre crema: **1.37:1**. Arena sobre crema: **1.13:1**. Foco terracota sobre arena: **2.69:1**. WCAG 1.4.11 pide 3:1 | Borde de input en neutral 600 (3.61:1) y anillo de foco en terracota 700 (5.72:1 sobre crema, 5.09:1 sobre arena) |
| 12 | Montos "₡14.000", fechas "martes 16 de setiembre" | La app usa `toLocaleString("es-CR")`, que devuelve **"14 000"** (con espacio) y **"septiembre"** (verificado en Node 22) | Helpers centralizados. Ver D9 |
| 13 | Rampa del heatmap: neutral-200 → terracota 200 → 300 → 400 → base | Contraste entre pasos vecinos: **1.01**, 1.22, 1.37 y 1.74:1. Los tres primeros casi no se distinguen | Rampa ajustada y leyenda. Ver D10 |
| 14 | Solo modo claro | Hay un bloque `.dark` en `globals.css` que nunca se activa, porque no hay `ThemeProvider`. `components/ui/sonner.tsx` usa `useTheme()`, que devuelve `"system"`, y puede pintar toasts oscuros | Solo modo claro. Ver D8 |
| 15 | Horarios de "Hoy · Noche" | **Bug:** `hoy = new Date().toISOString().slice(0,10)` corre en UTC en el servidor. Después de las 18:00 de Costa Rica, "hoy" pasa a ser mañana y **desaparecen los horarios de esta noche** (`canchas/[canchaId]/page.tsx`; lo mismo en `reservas/page.tsx`) | Ver D11 |
| 16 | Pantallas sin diseño: nueva cancha, info de cancha, crear horario, set-password | Existen. `app/auth/set-password/page.tsx` usa `zinc-*`, `black` y `white` escritos a mano | Heredan los tokens y se ajustan en la Fase 13 |

---

## 2. Decisiones que Julián debe confirmar (cada una trae un default)

Si una decisión queda sin respuesta, Claude Code aplica el **default** y lo anota en `DECISIONS.md` en la Fase 0. Para cambiar una, editá la columna "Estado".

| ID | Decisión | Default recomendado | Alternativa | Estado |
|---|---|---|---|---|
| D1 | Pantallas de auth | Piel nueva sobre el flujo actual. `/login` = volver + título + correo + las **tarjetas de rol** de la pantalla "Crear cuenta" + "Entrar". Sin contraseña ni "Olvidé mi contraseña". `/register` sigue redirigiendo | Reactivar la contraseña, que es otro proyecto con cambio de lógica | pendiente |
| D2 | Hoja de pago | **Dos pasos sobre las rutas existentes** (Fase 7). Paso 1 (`reservar/[slotId]`): número, monto y "Ya pagué, adjuntar comprobante" (`confirmarPago`, sin cambios). Paso 2 (`…/comprobante`): la hoja completa del diseño con el adjunto. **Sin contador** en ningún paso, porque una reserva `creada` no tiene plazo | Implementar el contador, lo que exige una migración (ver R1) | pendiente |
| D3 | Distancia, "Cerca de mí" y dirección | Se omiten. La línea meta muestra ★ rating y la descripción en una línea. El buscador filtra por nombre y descripción | Proyecto aparte: RPC PostGIS + permiso de ubicación + campo de dirección | pendiente |
| D4 | Precio en la card | Lectura nueva: el mínimo de `slots.precio` con `estado = 'disponible'` en los próximos 14 días, mostrado como "desde ₡12.000". Si no hay, no se muestra | No mostrar precio | pendiente |
| D5 | Pestaña Perfil | Página nueva `/futbolero/perfil`, de solo lectura: nombre, correo y botón "Salir" (usa la action `logout` existente) | Barra de 2 ítems y "Salir" en otro lado | pendiente |
| D6 | Navegación del admin | Rutas nuevas de navegación y lectura: `/admin/canchas` (lista con "Info" y "Horarios"); `/admin/horarios` (con 1 cancha redirige a `/admin/canchas/{id}/slots/nueva`, con varias muestra la lista); `/admin/mas` (mobile: Canchas, Estadísticas, Nueva cancha, Salir) | Sidebar solo con las rutas que ya existen | pendiente |
| D7 | Contraste de los rellenos con texto | **Accesible:** `--primary` = terracota 700 `#8c491a` (5.72:1), hover 800 y pressed 900. "Confirmar reserva" en sage 700 `#56633f` (5.43:1). La terracota base `#c67139` queda como `--brand` para acentos sin texto: estrellas, timeline, heatmap, marca, contador del sidebar con número (ver nota) | Fidelidad exacta: `#c67139` con 3.03:1, que falla AA y se acepta como deuda | pendiente |
| D8 | Tema | Solo claro: eliminar el bloque `.dark` y usar `<Toaster theme="light">` | Mantener el código muerto | pendiente |
| D9 | Formatos | `lib/formato.ts` con `formatearColones(n)` → "₡14.000" (punto de miles, como el diseño y el uso local) y `formatearFecha…` con `timeZone: "America/Costa_Rica"` y "setiembre". Reemplaza todos los `toLocaleString("es-CR")` de montos y fechas | Dejar el formato de Intl: "₡14 000", "septiembre" | pendiente |
| D10 | Rampa del heatmap | **Ajustada:** crema → terracota 300 → 500 → 700 → 900 (contraste entre vecinos 1.27 / 1.99 / 2.27 / 2.10), más leyenda "menos → más" y texto accesible por celda | La del README, con los 3 primeros pasos casi indistinguibles | pendiente |
| D11 | Bug de "hoy" en UTC | Commit aparte `fix(fechas)` **antes de la Fase 6**: `lib/fecha.ts` → `hoyCR()` y `sumarDiasCR()`, usados en `canchas/[canchaId]/page.tsx` y `reservas/page.tsx`. Cambia qué filas se leen, no la máquina de estados | Dejarlo y aceptar que de 18:00 a 24:00 no se ven los horarios de esa noche | pendiente |
| D12 | Rama de trabajo | Rama local `rediseno-organic`, commits por fase y merge a `main` al final. `main` hace deploy automático al hacer push, y así un push a mitad de camino no publica un rediseño a medias | Commits directo en `main` | pendiente |
| D13 | Etiqueta "Noche · la más pedida" | Se calcula con los slots visibles: la franja con mayor proporción de slots `retenido`/`reservado` en los 14 días, con al menos 3 ocupados. Si no hay señal clara, no hay etiqueta | Texto fijo, que sería una afirmación inventada | pendiente |

> Nota sobre D7: el contador del sidebar ("3") y el ítem activo llevan texto, así que usan `--primary`, no `--brand`. `--brand` solo va en superficies **sin texto encima**, o con íconos (contraste no textual de 3:1: crema sobre `#c67139` da 3.03:1, justo en el límite).

---

## 3. Contraste medido (fórmula WCAG 2.1; los números salen de los hex del handoff)

| Par | Ratio | AA texto normal (4.5) | Uso |
|---|---|---|---|
| Crema sobre terracota base `#c67139` | 3.03 | ❌ | Botón primario, chips activos, slot seleccionado (según el diseño) |
| Crema sobre terracota 600 `#b2622d` | 3.77 | ❌ | Hover (según el diseño) |
| Crema sobre terracota 700 `#8c491a` | 5.72 | ✅ | **Primario propuesto (D7)** |
| Crema sobre terracota 800 `#643312` | 8.72 | ✅ | Hover propuesto |
| Crema sobre sage 600 `#728157` | 3.53 | ❌ | "Confirmar reserva" (según el diseño) |
| Crema sobre sage 700 `#56633f` | 5.43 | ✅ | **Confirmar propuesto (D7)** |
| Tinta sobre terracota base | 4.60 | ✅ | Alternativa válida si se quiere mantener el relleno base |
| Tinta sobre crema / arena | 13.95 / 12.40 | ✅ | Texto principal |
| Neutral 800 sobre crema / arena | 8.38 / 7.45 | ✅ | Texto secundario (`--muted-foreground`) |
| Neutral 700 sobre crema / arena | 5.53 / 4.92 | ✅ | Kickers |
| Terracota 700 sobre crema / arena | 5.72 / 5.09 | ✅ | Links, orden, pestaña activa de la barra inferior |
| Badges (neutral 800/200, terracota 900/200, sage 900/200) | 8.12 / 11.55 / 11.59 | ✅ | `EstadoReservaBadge` |
| Tag de amenidad sage 800/100 | 9.12 | ✅ | |
| Error o número SINPE: terracota 900/100 | 13.07 | ✅ | |
| Delta positivo: sage 700 sobre arena | 4.82 | ✅ | StatCard |
| **No textual (hace falta 3:1)** | | | |
| Divider 16% sobre crema | 1.37 | ❌ | Solo decorativo: separadores, bordes de cards con texto |
| Relleno arena del input vs. crema | 1.13 | ❌ | → Borde de input en neutral 600: **3.61** ✅ |
| Foco terracota base sobre arena | 2.69 | ❌ | → Foco en terracota 700: **5.09** ✅ |
| Radio no seleccionado, neutral 400 sobre crema | 1.68 | ❌ | → Borde del radio en neutral 600 |

---

## 4. Arquitectura de tokens (referencia de la Fase 1)

### 4.1 `app/globals.css`: estructura objetivo

Se mantienen los tres `@import` y el `@custom-variant`. Si se aplica D8, se elimina `@custom-variant dark` y el bloque `.dark`.

```css
@theme inline {
  /* …mapeos shadcn existentes (--color-background, --color-primary, etc.)… */
  --color-brand: var(--brand);
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --font-sans: var(--font-sans);
  --font-heading: var(--font-sans);
}

@theme {
  /* Rampas del sistema Organic (paso 100 → 900). Generan bg-/text-/border-/fill-* */
  --color-neutral-100: #f9f4ed;  --color-neutral-200: #eee7db;  --color-neutral-300: #dcd3c4;
  --color-neutral-400: #c0b6a5;  --color-neutral-500: #a19786;  --color-neutral-600: #82796a;
  --color-neutral-700: #645c50;  --color-neutral-800: #474238;  --color-neutral-900: #2e2b25;

  --color-terracota: #c67139;
  --color-terracota-100: #fff2eb; --color-terracota-200: #ffe1d0; --color-terracota-300: #ffc6a5;
  --color-terracota-400: #f6a06b; --color-terracota-500: #d67f48; --color-terracota-600: #b2622d;
  --color-terracota-700: #8c491a; --color-terracota-800: #643312; --color-terracota-900: #402310;

  --color-sage: #7a8a5e;
  --color-sage-100: #f0fae1; --color-sage-200: #e1eecc; --color-sage-300: #ccdbb2;
  --color-sage-400: #aebf92; --color-sage-500: #8fa073; --color-sage-600: #728157;
  --color-sage-700: #56633f; --color-sage-800: #3d472b; --color-sage-900: #272e1b;

  /* Radios con nombre → rounded-card, rounded-panel, etc. */
  --radius-celda: 9px;     /* celdas del heatmap */
  --radius-thumb: 18px;    /* ícono del adjunto, miniatura admin */
  --radius-slot: 20px;     /* pastilla de horario, filas de ayuda */
  --radius-dia: 22px;      /* pastilla de día */
  --radius-fila: 24px;     /* filas crema, tarjetas de rol */
  --radius-card: 26px;     /* cards */
  --radius-panel: 28px;    /* paneles admin, banner, ítem de la cola */
  --radius-header: 32px;   /* cabeceras con esquinas inferiores, lámina del detalle */
  --radius-sheet: 34px;    /* hoja inferior */

  --shadow-sm: 0 1px 2px rgb(46 43 37 / 0.14);
  --shadow-md: 0 3px 10px rgb(46 43 37 / 0.16);
  --shadow-lg: 0 12px 32px rgb(46 43 37 / 0.22);
}

:root {
  --background: #f5ead8;            /* crema */
  --foreground: #201e1d;
  --card: #ebddc5;                  /* arena */
  --card-foreground: #201e1d;
  --popover: #f5ead8;
  --popover-foreground: #201e1d;
  --brand: #c67139;                 /* acento sin texto encima (D7) */
  --primary: #8c491a;               /* D7 accesible; alternativa fiel: #c67139 */
  --primary-hover: #643312;         /* alternativa fiel: #b2622d */
  --primary-active: #402310;        /* alternativa fiel: #8c491a */
  --primary-foreground: #f5ead8;
  --secondary: #ebddc5;
  --secondary-foreground: #201e1d;
  --muted: #eee7db;
  --muted-foreground: #474238;      /* neutral 800 */
  --accent: #eee7db;                /* fondo hover de ghost/outline */
  --accent-foreground: #201e1d;
  --destructive: #643312;
  --danger: #643312;
  --danger-foreground: #f5ead8;
  --success: #56633f;               /* sage 700 */
  --success-foreground: #f5ead8;
  --warning: #8c491a;
  --warning-foreground: #f5ead8;
  --neutral: #474238;
  --border: color-mix(in srgb, #201e1d 16%, transparent);  /* divider */
  --input: #82796a;                 /* borde de input, 3.61:1 */
  --ring: #8c491a;
  --chart-1: #f5ead8; --chart-2: #ffc6a5; --chart-3: #d67f48; --chart-4: #8c491a; --chart-5: #402310; /* D10 */
  --radius: 1rem;
  --sidebar: #ebddc5; --sidebar-foreground: #201e1d;
  --sidebar-primary: #8c491a; --sidebar-primary-foreground: #f5ead8;
  --sidebar-accent: #eee7db; --sidebar-accent-foreground: #201e1d;
  --sidebar-border: color-mix(in srgb, #201e1d 16%, transparent); --sidebar-ring: #8c491a;
}

@utility washed { filter: saturate(0.6) contrast(0.85) brightness(1.1) opacity(0.94); }
@utility kicker { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-neutral-700); }

@layer base {
  * { @apply border-border; }
  html { @apply font-sans; }
  body { @apply bg-background text-foreground; }
  h1, h2, h3, h4 { @apply font-bold tracking-[-0.02em]; }
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  svg.lucide { stroke-width: 2.75; }  /* verificar en el DOM que lucide-react 1.46 usa la clase "lucide" */
}
```

Notas:

- La rampa `neutral-*` **pisa** la paleta `neutral` que trae Tailwind. Los pasos 50 y 950 quedan con los valores de Tailwind: no usarlos.
- `text-neutral` y `bg-neutral/10` (el semántico sin número) siguen existiendo hasta la Fase 8, que los elimina.
- **Espaciado:** no se toca `--spacing`, que sigue siendo la escala de Tailwind de 4px. La escala del diseño (4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2) se redondea al paso de Tailwind más cercano (1 / 2 / 3 / 4.5 / 6.5 / 9). Cambiar la base movería cada layout existente.
- **Tipografía:** Figtree variable vía `next/font/google` con `variable: "--font-sans"` y `subsets: ["latin"]`. Leer antes `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`. Escala de títulos: 34 / 32 / 30 / 28 / 27 / 25 / 22 / 21 / 19. Los títulos ≥27px llevan `tracking-[-0.025em]`.
- **Íconos:** lucide-react 1.46. Todos los nombres del README existen, verificados en `dist/lucide-react.d.ts`. `bar-chart` corresponde a `ChartColumn` o `ChartBar`.

### 4.2 Estados de `Reserva`: fuente única

`components/shared/EstadoReservaBadge.tsx` exporta, además de `ETIQUETA_ESTADO_RESERVA`, un `TONO_ESTADO_RESERVA` que usan el badge, la cabecera de la pantalla de estado y las filas. Nadie más define colores de estado.

| Estado | Badge (fondo / texto) | Cabecera (fondo / círculo / texto) | Ícono | Etiqueta |
|---|---|---|---|---|
| `creada` | `bg-neutral-200` / `text-neutral-800` | `bg-neutral-200` / `bg-neutral-800` / `text-neutral-900` | `Clock` | Esperando pago |
| `pendiente_validacion` | `bg-terracota-200` / `text-terracota-900` | `bg-terracota-100` / `bg-brand` / `text-terracota-900` | `Hourglass` | En revisión |
| `confirmada` | `bg-sage-200` / `text-sage-900` | `bg-sage-100` / `bg-sage-700` / `text-sage-900` | `CircleCheck` | Confirmada |
| `rechazada` | `bg-terracota-200` / `text-terracota-900` | `bg-terracota-100` / `bg-terracota-800` / `text-terracota-900` | `CircleX` | Rechazada |
| `expirada` | `bg-neutral-200` / `text-neutral-800` | `bg-neutral-200` / `bg-neutral-700` / `text-neutral-900` | `TimerOff` | Expirada |
| `cancelada` | `bg-neutral-200` / `text-neutral-800` | `bg-neutral-200` / `bg-neutral-700` / `text-neutral-900` | `CircleSlash2` | Cancelada |

"En revisión" y "Rechazada" comparten color **a propósito**, como indica el README. Se distinguen por el ícono y el texto, que siempre van juntos.

---

## 5. Fases

Orden: **0 → 1 → 2 → 3** (bloquean todo lo demás). **D11** va antes de la 6. Las fases **4 a 12** siguen el orden de PROMPT.md. La **13** cierra.

### Fase 0 — Preparación
**Commit:** `chore(rediseño): handoff de diseño + decisiones`

- [x] Crear la rama local `rediseno-organic` (D12).
- [x] Verificar que `design_handoff_dale_cancha/` está en la raíz del repo y agregarlo a git.
- [x] Agregar a `DECISIONS.md` una entrada "2026-09-XX — Rediseño Organic (Turno 2a)" con D1–D13 resueltas y un enlace a este plan.
- [x] Agregar al inicio de `plan-ui-ux-canchas-fut5-cr.md`, sección 2 (paleta verde e Inter), el aviso: "**Reemplazada por el sistema Organic** — ver plan-rediseno-dale-cancha.md §4". Si no, un agente futuro sigue los tokens viejos.
- [x] (Opcional) Capturas "antes" a 390 y 1280 de las pantallas de la sección 8, en `design_handoff_dale_cancha/antes/`. No se commitean si pesan más de 2 MB.

### Fase 0.5 — Fix de fechas (solo si D11 = sí)
**Commit:** `fix(fechas): calcular "hoy" en hora de Costa Rica`

- [x] `lib/fecha.ts`: `hoyCR(): string` (YYYY-MM-DD con `Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" })`) y `sumarDiasCR(fechaISO, n)`.
- [x] Usarlos en `app/futbolero/canchas/[canchaId]/page.tsx` (`hoy` y `en14Dias`) y en `app/futbolero/reservas/page.tsx` (`hoy`).
- [x] Verificación: con el reloj del sistema en 19:00 hora CR (o un test manual con fecha simulada), los horarios de esa noche siguen apareciendo.

### Fase 1 — Tokens, fuente y tema
**Archivos:** `app/globals.css`, `app/layout.tsx`, `components/ui/sonner.tsx`
**Commit:** `feat(ui): tokens Organic + Figtree`

- [x] Reescribir `globals.css` según la sección 4.1, con los valores de D7 y D10 ya resueltos.
- [x] En `layout.tsx`, cambiar `Inter` por `Figtree` (`variable: "--font-sans"`). Agregar `export const viewport = { themeColor: "#f5ead8", viewportFit: "cover" }` después de verificar la API en los docs de Next 16.
- [x] `sonner.tsx`: `theme="light"`, quitar `useTheme` (D8) y usar `--border-radius: var(--radius-card)`.
- [x] Si D8 = sí, eliminar el bloque `.dark` y `@custom-variant dark`.
- [x] Comprobar que la app compila y se ve crema con texto oscuro. Que los componentes todavía se vean "viejos" es esperable.

**Aceptación:** no queda ningún hex fuera de `globals.css` (salvo `themeColor`) y la fuente computada del `body` es Figtree.

### Fase 2 — Primitivas (`components/ui/*`) y componentes compartidos nuevos
**Commit:** `feat(ui): primitivas en píldora + componentes compartidos`

Ajustar variantes, **sin reescribir** los componentes:

- [x] `button.tsx`
  - `rounded-full`; foco con `focus-visible:outline-2 outline-offset-2 outline-ring`, en vez de `ring-3 ring-ring/50`.
  - `default`: `bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active`.
  - `outline` (= "secundario" del diseño): `border-border bg-transparent hover:bg-accent`.
  - `ghost`: `text-terracota-700 hover:bg-terracota-100`.
  - `destructive`: `bg-terracota-100 text-terracota-800 hover:bg-terracota-200`.
  - `link`: `text-terracota-700`.
  - Variante **nueva** `success`: `bg-success text-success-foreground hover:bg-sage-800`.
  - **Tamaños con área táctil ≥44px:** `sm` = `h-11 px-4 text-[15px] font-semibold` (hoy mide 28px y se usa 8 veces); `default` = `h-11 px-5 text-base font-semibold`; `lg` = `h-[54px] px-6 text-[17px] font-bold`; `icon` = `size-11`; `icon-lg` = `size-[52px]`.
  - `xs`, `icon-xs` e `icon-sm` pasan a `size-11` o `h-11`. Verificar sus usos con grep.
- [x] `input.tsx`: `h-[52px] rounded-full bg-card border-input px-3.5 text-base` y **quitar `md:text-sm`** (16px siempre; también evita el zoom en iOS).
- [x] `textarea.tsx`: `rounded-slot bg-card border-input text-base`.
- [x] `card.tsx`: `rounded-card bg-card`, sin `ring-1`. Las esquinas internas (`rounded-t-xl` y demás) pasan a `rounded-t-card`. Se mantiene la API (`size`, subcomponentes).
- [x] `badge.tsx`: `rounded-full h-auto px-3 py-1.5 text-sm font-semibold [&>svg]:size-[15px]`. Variantes nuevas: `neutral` (`bg-neutral-100 text-neutral-800`), `terracota` (`bg-terracota-100 text-terracota-800`) y `sage` (`bg-sage-100 text-sage-800`).
- [x] `tabs.tsx`
  - La variante `default` pasa a ser la "píldora": `TabsList` con `bg-card rounded-full p-[5px] h-auto gap-1.5 w-full`.
  - `TabsTrigger` con `min-h-[42px] rounded-full text-[15px] text-neutral-800`; activo con `data-active:bg-primary data-active:text-primary-foreground data-active:font-bold`.
  - La variante `line` queda como está.
- [x] `dialog.tsx`: overlay `bg-neutral-900/50`, popup `rounded-[32px] bg-popover shadow-lg p-5`, sin `ring`. Título en 20px bold.
- [x] `select.tsx`, `checkbox.tsx`, `radio-group.tsx`: bordes `border-input`, foco `outline-ring`, radio seleccionado `bg-primary` con anillo interno crema.
- [x] `skeleton.tsx`: `bg-muted rounded-card`. `label.tsx`: `text-sm text-muted-foreground`.

Componentes compartidos **nuevos** (en `components/shared/`), para no duplicar markup en las fases siguientes:

- [x] `Marca.tsx`: círculo de 34px `bg-brand` con el glifo de pelota del diseño (SVG propio con `currentColor`) y "Dale Cancha" en 700/19px. Acepta `tamaño`.
- [x] `BotonVolver.tsx`: `Link` circular de 44px (`bg-card`, o `bg-background` + `shadow-sm` sobre foto), con `ChevronLeft` y `aria-label` obligatorio.
- [x] `Aviso.tsx`: `tono: "info" | "exito" | "atencion" | "error"`, con ícono, texto de 14–15px y `rounded-slot`.
  - `error` y `atencion`: `bg-terracota-100 text-terracota-900`.
  - `exito`: `bg-sage-100 text-sage-900`.
  - `info`: `bg-neutral-100 text-neutral-800`.
  - Reemplaza las cajas `border-warning/30 bg-warning/10` (4 lugares) y los `<p className="text-danger">` de error de formulario.
- [x] `ChipFiltro.tsx`: `button` de 42px en píldora con `aria-pressed`. Activo con `bg-primary text-primary-foreground font-bold`; inactivo con `border border-border`.
- [x] `HojaInferior.tsx`: construida sobre `components/ui/dialog.tsx` (Base UI Dialog), así hereda el manejo de foco y Esc.
  - Popup anclado abajo: `fixed inset-x-0 bottom-0 rounded-t-sheet shadow-lg px-[22px] pt-3.5 pb-[max(30px,env(safe-area-inset-bottom))]`, asa de 44×5px con `aria-hidden`.
  - `max-w-md mx-auto` en desktop.
  - Animación `slide-in-from-bottom` con `motion-reduce:animate-none`.
  - Overlay `bg-neutral-900/42`.
  - Props: `titulo`, `abierta` y `hrefCerrar` (string, no callback: al cerrar hace `router.push(hrefCerrar)` desde adentro).
- [x] `BarraAccionInferior.tsx`: barra fija `border-t border-border bg-background px-5 pt-3.5 pb-[max(30px,env(safe-area-inset-bottom))]`, con slot izquierdo y derecho.
- [x] `ContadorExpiracion.tsx`: **se extrae** de `ColaValidacion.tsx`, con la misma lógica de minutos cada 15 s. Tag en píldora con ícono `Clock`:
  - más de 20 min: `bg-sage-200 text-sage-900`;
  - de 1 a 20 min: `bg-terracota-200 text-terracota-900`;
  - 0 o menos: "Venciendo…".
  - Prop `formato: "corto" | "largo"` ("Vence en 12 min" / "vence en 12 min").
- [x] `FotoCancha.tsx`: `<img>` con clase `washed` y esquinas del contenedor. Sin URL, muestra `CanchaIlustracion`. **No usarlo para comprobantes.**
- [x] `Avatar.tsx`: iniciales sobre `bg-sage-300 text-sage-900`, 36px.
- [x] `lib/formato.ts` (D9): `formatearColones`, `formatearFechaLarga` ("martes 16 de setiembre"), `formatearDiaCorto` ("sáb 20"), `formatearHora` ("18:00"), `formatearRangoHoras` ("18:00–19:00") e `iniciales(nombre)`. Todo con `timeZone: "America/Costa_Rica"`.

**Aceptación:**
- Ningún `Button` mide menos de 44px de alto.
- `grep -rn "md:text-sm" components/ui` no devuelve nada.
- Los componentes nuevos compilan y todavía no se usan.

### Fase 3 — Navegación y estructura de layouts
**Archivos:** `components/NavBar.tsx`, `components/BarraInferior.tsx` (nuevo), `components/admin/SidebarAdmin.tsx` (nuevo), `app/futbolero/layout.tsx`, `app/admin/layout.tsx`, `lib/admin/contarPendientes.ts` (nuevo, solo lectura), `app/futbolero/perfil/page.tsx` (D5), `app/admin/canchas/page.tsx`, `app/admin/horarios/page.tsx`, `app/admin/mas/page.tsx` (D6)
**Commit:** `feat(ui): barra inferior mobile, header desktop y sidebar admin`

- [x] **Estructura full-bleed.** Las pantallas nuevas tienen cabeceras de borde a borde: la cabecera arena de Buscar, la foto del detalle y la cabecera tintada del estado. Por eso el `main` de los layouts **pierde el padding horizontal y el `max-w-4xl` en mobile**, y cada página usa su propio contenedor (`px-5`, o `px-[22px]` según la pantalla). En ≥768px, `max-w-5xl mx-auto`.
- [x] `lib/admin/contarPendientes.ts`: mueve la lógica de conteo que hoy vive en `app/admin/page.tsx` (canchas → slots → reservas `pendiente_validacion`). Devuelve `{ total, expiraMasProxima }`. La usan el layout y el panel.
- [x] **Futbolero, menos de 768px:** `BarraInferior` (client component, usa `usePathname`).
  - Ítems: Buscar (`Search`, `/futbolero/canchas`), Mis reservas (`Calendar`, `/futbolero/reservas`), Perfil (`User`, `/futbolero/perfil`).
  - Estilo: `bg-card border-t border-border pt-2.5 pb-[max(26px,env(safe-area-inset-bottom))]`.
  - Cada ítem ocupa al menos 48px, con ícono de 24px y label de 12px. El activo va en `text-terracota-700 font-bold` con `aria-current="page"`.
  - **Solo se muestra en las rutas de primer nivel** (las tres de arriba). En detalle, reservar, comprobante y estado no aparece: son pantallas "empujadas", como en el diseño.
  - El `main` reserva espacio abajo (`pb-[calc(84px+env(safe-area-inset-bottom))]`) solo cuando la barra está visible.
- [x] **Futbolero, 768px o más:** `NavBar` rediseñado. `Marca` a la izquierda; links en píldora (activo `bg-primary text-primary-foreground`, inactivo `text-neutral-800 hover:bg-accent`); a la derecha `Avatar` y "Salir" (`variant="ghost"`). Fondo `bg-card`, sin borde inferior, esquinas inferiores `rounded-b-header` opcionales.
- [x] **Admin, 1024px o más:** `SidebarAdmin`, fijo, de 252px, `bg-card px-[18px] py-[26px] gap-[26px]`.
  - Marca de 18px.
  - Ítems en píldora de 46px: Panel `/admin`, Validaciones `/admin/validaciones`, Horarios `/admin/horarios`, Canchas `/admin/canchas`, Estadísticas `/admin/insights`. El activo va en `bg-primary text-primary-foreground font-bold`.
  - Validaciones muestra el contador a la derecha: píldora de 13px/700, `bg-primary text-primary-foreground`, o `bg-background text-terracota-800` cuando el ítem está activo. Solo aparece si `total > 0`, con `aria-label="3 pendientes"`.
  - Al pie, una ficha de usuario en píldora `bg-background`: Avatar, nombre en 15/700 y "Dueño · N canchas" en 13px. Debajo, "Salir".
- [x] **Admin, menos de 1024px:** `BarraInferior` con Panel (`LayoutGrid`), Validaciones (`ClipboardCheck`, con contador), Horarios (`Calendar`) y Más (`Ellipsis` → `/admin/mas`).
- [x] Los layouts (Server Components) leen el perfil (`usuarios.nombre`) y `contarPendientes()`, y pasan **solo números y strings** a los componentes de navegación.
- [x] Páginas nuevas:
  - `/futbolero/perfil`: título, Avatar grande, nombre, correo y botón `outline` "Salir" en un `<form action={logout}>`.
  - `/admin/canchas`: lista de filas crema como las de "Mis canchas" en la Fase 10, con los botones "Info" y "Horarios".
  - `/admin/horarios`: según D6.
  - `/admin/mas`: lista de links de 56px más "Salir".
- [x] `ColaValidacion` ya llama a `router.refresh()` después de confirmar o rechazar. Verificar que el contador del layout se actualiza con eso: en App Router, el layout se vuelve a renderizar en `refresh()`.

**Aceptación:**
- A 390px, la barra inferior se ve en Buscar, Mis reservas y Perfil, y no se ve en Detalle.
- A 1280px, el admin tiene sidebar y el contador coincide con la cola.
- Todo se puede operar con teclado.

### Fase 4 — Entrada y Entrar
**Archivos:** `app/page.tsx`, `app/login/LoginForm.tsx`, `app/login/page.tsx`, `components/CanchaIlustracion.tsx`
**Commit:** `feat(ui): entrada y login con la piel Organic`

- [x] `CanchaIlustracion`: fondo `fill-sage`, líneas `stroke-background` con `strokeOpacity 0.5`, pelotas `fill-brand` y `fill-background`. Sin `rx`, porque el contenedor recorta. Mantiene `role="img"` y `aria-label`.
- [x] **Entrada** (`app/page.tsx`): columna `min-h-dvh` con padding 52/26/34.
  - Arriba, `Marca`.
  - Al centro, la ilustración en un contenedor `rounded-[32px] shadow-md overflow-hidden`, el título "Reservá tu cancha de fut5" en 700/34px (dos líneas, `text-balance`) y el párrafo del README en 17px `text-neutral-800`.
  - Abajo, el botón `lg` "Entrar" (`/login`) y el botón `lg outline` "Crear cuenta" (`/login?modo=crear`).
  - La redirección por rol **no cambia**.
- [x] **Entrar** (`LoginForm.tsx`), según D1:
  - `BotonVolver` a `/`.
  - Título en 700/30px: "Entrá a tu cuenta", o "Creá tu cuenta" si `modo=crear`.
  - Subtítulo en 16px: "Con tu correo. Si todavía no tenés cuenta, la creamos al entrar."
  - Input "Correo" de 52px con label de 14px.
  - `fieldset` "¿Cómo vas a usar la app?" con las dos **tarjetas de rol** del diseño:
    - `min-h-[60px] rounded-fila`;
    - seleccionada: `border-2 border-brand bg-terracota-100` y dot de 22px lleno;
    - no seleccionada: `border border-border` y dot `border-neutral-600`;
    - usar `RadioGroup` con `has-data-checked:`, como hoy;
    - textos: "Quiero jugar / Buscar canchas y reservar" (`futbolero`) y "Tengo una cancha / Publicar horarios y cobrar" (`admin_cancha`).
  - Nota de 14px bajo las tarjetas: "Si ya tenés cuenta, entrás con el tipo que elegiste la primera vez." Refleja lo que hace `entrar` hoy.
  - Botón `lg` a todo el ancho: "Entrar", y "Entrando…" mientras carga.
  - Errores con `Aviso tono="error"`, y el `link_invalido` con `Aviso tono="atencion"`.
  - **Sin** campo de contraseña ni "Olvidé mi contraseña".
  - `app/register/page.tsx` **no se toca**.

### Fase 5 — Buscar
**Archivos:** `app/futbolero/canchas/page.tsx`, `ListaCanchas.tsx`, `components/shared/CanchaCard.tsx`, `components/shared/RatingResumen.tsx`, `app/futbolero/canchas/loading.tsx`
**Commit:** `feat(ui): búsqueda en rejilla con filtros por amenidad`

- [x] `page.tsx` (lecturas nuevas):
  - agregar `amenidades` al select de `canchas`;
  - leer el nombre del usuario para el avatar;
  - D4: `slots.select("cancha_id, precio").eq("estado","disponible").gte("fecha", hoy).lte("fecha", en14)` y calcular el mínimo por cancha en JS.
  - Pasar a `ListaCanchas` solo datos serializables: `amenidades` ya parseadas con `parsearAmenidades` y `precioDesde`.
- [x] Cabecera `bg-card rounded-b-header px-5 pt-[52px] pb-4 gap-3.5`, con dos filas:
  - Fila 1: "Dale Cancha" en 700/19px y `Avatar`.
  - Fila 2: buscador de 50px en píldora `bg-background`, con ícono `Search`, `<label className="sr-only">Buscar</label>` y placeholder "Buscá por cancha" (D3: la zona no existe). Filtra por nombre y descripción, sin distinguir tildes (`normalize("NFD")`).
- [x] Chips (`ChipFiltro`) en scroll horizontal (`overflow-x-auto`, `snap-x`): Techada, Parqueo, Duchas, Iluminación, con las claves de `lib/amenidades.ts`.
  - Se combinan con Y.
  - **Se eliminan** los chips de rating actuales ("3+ ⭐", "4+ ⭐"), porque el orden los reemplaza.
  - No hay chip "Cerca de mí" (D3).
- [x] Fila de resultados: "N canchas" (15px `text-neutral-800`) a la izquierda. A la derecha, el orden con `Select` de `components/ui/select.tsx`, con apariencia de link `text-terracota-700 font-bold` y `ChevronDown`. Opciones: "Mejor calificadas" (por defecto) y "Menor precio" (solo si hay precios). Recordar el gotcha de `SelectValue`.
- [x] Rejilla: `grid grid-cols-2 gap-3.5 px-5` en mobile, `md:grid-cols-3` y `lg:grid-cols-4`.
- [x] `CanchaCard` (toda la card es un `Link`, con foco visible):
  - `rounded-card bg-card shadow-sm overflow-hidden`.
  - `FotoCancha` de 96px de alto.
  - Cuerpo `pt-3 px-3.5 pb-3.5 gap-0.5`.
  - Nombre en 700/15px.
  - Línea meta de 13px `text-neutral-800`:
    - `Star` relleno `fill-brand stroke-brand` de 12px y el rating con un decimal;
    - si el rating es 0, "Nueva" en vez del número (la regla de `RatingResumen`);
    - después, `· descripción` con `line-clamp-1`.
  - Precio en 700/15px ("desde ₡12.000"), solo si existe.
- [x] Estados vacíos: `EmptyState` restilizado (Fase 13). Textos: "Todavía no hay canchas publicadas" / "Volvé más tarde." se mantienen. **Cambio obligado:** "Probá con un filtro de rating más bajo." pasa a "Probá quitando algún filtro.", porque ese filtro ya no existe.
- [x] `loading.tsx`: skeleton con la misma forma (cabecera arena más una rejilla de 2 columnas con cards de radio 26).

### Fase 6 — Detalle y horarios
**Archivos:** `app/futbolero/canchas/[canchaId]/page.tsx`, `components/shared/GaleriaFotos.tsx`, `components/shared/AmenidadesGrid.tsx`, `components/shared/SlotPicker.tsx`
**Commit:** `feat(ui): detalle con lámina y horarios agrupados por franja`
**Depende de:** D11 (si se aprobó, ya está hecho).

- [x] Portada: `GaleriaFotos` a 196px de borde a borde, con scroll-snap y fotos `washed`.
  - Pasa a ser un client component mínimo para el contador "1 / N" (píldora `bg-background shadow-sm` de 36px, arriba a la derecha). El índice sale de `scrollLeft` o de un `IntersectionObserver`.
  - `BotonVolver` arriba a la izquierda, con `href="/futbolero/canchas"`.
  - Sin fotos: `CanchaIlustracion` a 196px.
- [x] Lámina: `-mt-[26px] relative rounded-t-header bg-background px-5 pt-5 gap-3.5`.
  - Título en 700/25px.
  - Línea de 15px: `Star` relleno y rating en 700 más `· descripción` (D3; no hay dirección).
  - `politica_cancelacion` se mantiene como `<details>` con el estilo de `Aviso tono="info"`.
- [x] Amenidades como tags `Badge variant="sage"` (13px, ícono de 15px). Se muestran las 3 primeras y un botón-tag `neutral` "+N" que despliega el resto, con `aria-expanded`. `AmenidadesGrid` se convierte en ese componente o se reemplaza.
- [x] El `error=slot_no_disponible` se muestra con `Aviso tono="atencion"` y el mismo texto.
- [x] `SlotPicker`:
  - **Días:** se mantienen los `Tabs` de Base UI (navegación con flechas). Los triggers pasan a pastillas de `w-14 py-2 rounded-dia`, con el día abreviado en 12px ("Hoy", "Mañana", "mié") sobre el número en 700/19px. Activo con `bg-primary text-primary-foreground`, inactivo con `bg-card`. Scroll horizontal.
  - **Franjas:** agrupar los slots del día en Mañana (antes de las 12:00), Tarde (12:00–17:59) y Noche (desde las 18:00). Cada franja lleva un kicker. La franja más pedida (D13) lleva el kicker `text-terracota-700` y el texto "Noche · la más pedida". Las franjas vacías no se muestran.
  - **Pastilla** `min-w-[100px] min-h-12 rounded-slot`, con la hora en **700/16px** (el diseño dice 15px; se sube a 16 por la regla de texto interactivo) y el precio en 12px.
    - Disponible: `bg-card border border-border`.
    - Seleccionado: `bg-primary text-primary-foreground shadow-sm` con `aria-pressed="true"`.
    - Retenido o reservado: `bg-neutral-200 text-neutral-800`, texto "19:00 · Ocupado", `disabled`.
    - Bloqueado: igual, con "19:00 · No disponible".
  - **Barra inferior** (`BarraAccionInferior`, solo si hay selección):
    - Izquierda: "Hoy 18:00–19:00" en 13px sobre el precio en 700/20px, con `aria-live="polite"`.
    - Derecha: `Button size="lg"` "Continuar", `flex-1`, que es un `Link` a `reservar/[slotId]` como hoy.
    - Seleccionar nunca navega. Cambiar de selección no navega.
  - Se quita el `pb-20` fijo y se reserva el espacio real de la barra.
- [x] Día sin horarios: "No hay horarios este día." en 15px `text-neutral-800`.

### Fase 7 — Hoja de pago SINPE y comprobante
**Archivos:** `app/futbolero/canchas/[canchaId]/reservar/[slotId]/page.tsx`, `BotonCopiar.tsx`, `comprobante/page.tsx`, `comprobante/SubirComprobante.tsx`, `components/shared/ComprobanteUploader.tsx`, `components/shared/FondoDetalleCancha.tsx` (nuevo)
**No se tocan:** `actions.ts`, `app/api/reservas/[id]/comprobante/route.ts`
**Commit:** `feat(ui): pago SINPE como hoja inferior en dos pasos`

- [x] **Sin rutas interceptadas.** Next 16 cambió las convenciones y el beneficio no compensa el riesgo. Cada una de las dos páginas renderiza `FondoDetalleCancha` y encima `HojaInferior` siempre abierta, con `hrefCerrar` = detalle de la cancha.
  - `FondoDetalleCancha` es solo presentación: nombre y foto de la cancha, `blur-[1px] opacity-50` y `aria-hidden`.
- [x] **Paso 1** (`reservar/[slotId]/page.tsx`, D2). Se mantienen `slotTomado`, `reservaPropia` y `confirmarPago.bind` tal como están.
  - Encabezado: "Pagá por SINPE Móvil" en 700/21px y "Hoy 18:00–19:00 · {cancha}" en 14px. **Sin contador.**
  - Bloque del número: `bg-terracota-100 rounded-card px-[18px] py-4`, kicker "Número SINPE" en `text-terracota-800`, número en 700/26px `text-terracota-900` y `BotonCopiar`.
  - `BotonCopiar`: 44px, `bg-background border-terracota-300`, ícono `Copy`, "Copiar". Al copiar muestra "Copiado" con `aria-live`. La lógica del portapapeles no cambia.
  - Fila "Monto a transferir" (16px) con el valor en 700/24px.
  - `Aviso tono="info"`: "Hacé la transferencia y después adjuntá el comprobante. Tu horario queda apartado cuando tocás el botón."
  - `<form action={confirmarPagoConParams}>` con `Button size="lg"` a todo el ancho: **"Ya pagué, adjuntar comprobante"** (cambio de copy: el texto viejo decía "subir").
  - Si `slotTomado`: la hoja muestra `Aviso tono="atencion"` "Este horario ya no está disponible", el texto actual y el botón "Ver otros horarios".
- [x] **Paso 2** (`comprobante/page.tsx`): la misma hoja con el diseño completo del README (número, monto, adjunto, aviso y enviar).
  - Hace falta leer `canchas.numero_sinpe` y los datos del slot, que es una lectura nueva: hoy la página solo lee la reserva.
  - El aviso de estado usa el texto del diseño: "Todavía no está confirmada: la cancha revisa el comprobante y te avisamos acá mismo."
  - El caso "sin reserva" se restiliza y actualiza el copy al nuevo texto del botón.
  - El caso `estado !== "creada"` sigue con su `redirect`.
- [x] `ComprobanteUploader`: se restiliza por estado. **No cambian** `subirConReintentos`, `REINTENTOS_MAXIMOS`, los tiempos de espera ni `comprimirImagen`.
  - `idle`: fila-botón `w-full bg-card rounded-card px-4 py-3.5`, con un cuadro de 52px `rounded-thumb bg-neutral-300` e ícono `Camera`, más "Adjuntar comprobante" (16/700) y "Foto o captura del SINPE" (14px). Mantiene `capture="environment"`.
  - `comprimiendo`: la misma fila con "Preparando imagen…" y `aria-busy`.
  - `listo`, `subiendo` y `error`: vista de revisión (pantalla 7 del README) dentro de la hoja.
    - Título "Revisá que se lea el monto" (700/27px) y bajada "Así el dueño de la cancha lo valida de una."
    - Preview de `h-[300px] rounded-card object-contain bg-card`, **sin `washed`**.
    - Fila con `Button variant="outline" size="icon-lg"` (`RotateCcw`, `aria-label="Elegir otra imagen"`) y `Button size="lg" flex-1`, que muestra "Enviar comprobante", "Enviando…" o "Reintentar envío" según el estado.
    - `Aviso tono="exito"`: "Si se corta la señal lo reintentamos solo. No pierdas la imagen: queda guardada acá."
    - En `error`, `Aviso tono="error"` con el mensaje.
  - Como también se usa en `ReservaEstado` (estado `creada`), verificar que se ve bien fuera de la hoja.
- [x] Accesibilidad de la hoja:
  - `role="dialog"`, `aria-modal` y `aria-labelledby` al título.
  - El foco inicial va al título.
  - Esc y el overlay cierran hacia el detalle.
  - El fondo queda `inert` o `aria-hidden`.

**Aceptación:** el flujo completo funciona igual que antes (detalle → paso 1 → "Ya pagué" crea la reserva → paso 2 → subir → estado). Se prueba también el reintento, cortando la red en DevTools.

### Fase 8 — Estado de la reserva y badges
**Archivos:** `components/shared/EstadoReservaBadge.tsx`, `components/ReservaEstado.tsx`, `app/futbolero/reservas/[reservaId]/page.tsx`
**Commit:** `feat(ui): pantalla de estado con cabecera tintada y línea de tiempo`

- [x] `EstadoReservaBadge`: `CONFIG` según la sección 4.2 (badge en píldora, ícono de 15px, texto de 14px/600). Exportar `TONO_ESTADO_RESERVA`. `ETIQUETA_ESTADO_RESERVA` se mantiene igual.
- [x] `page.tsx` (lecturas nuevas):
  - agregar `comprobante_url` y `comprobante_subido_at` al select de `reservas`, y `fotos` al de `canchas`;
  - si hay comprobante, firmar la URL con `obtenerUrlComprobanteFirmada`, que el futbolero puede leer por la policy `comprobantes_select_dueno`;
  - pasar solo datos serializables.
- [x] `ReservaEstado`, **cabecera** (`TONO_ESTADO_RESERVA[estado]`, `rounded-b-header px-[22px] pt-[52px] pb-5 gap-4`):
  - Link "Mis reservas" de 44px con `ChevronLeft`.
  - Círculo de 52px con el ícono del estado (26px, crema).
  - Nombre del estado en 700/22px.
  - **Línea "qué sigue"** (15px), con copy honesto:
    - `creada`: "Transferí y adjuntá el comprobante."
    - `pendiente_validacion`: "La cancha lo revisa. Vence a las HH:MM si nadie responde." Usa `expira_at`. No usar "en menos de 30 min", que es una promesa.
    - `confirmada`: "Te esperamos en la cancha."
    - `rechazada`: "Motivo: {motivo_rechazo}".
    - `expirada` y `cancelada`: los textos actuales.
- [x] **Línea de tiempo** (solo `creada`, `pendiente_validacion` y `confirmada`), en un `<ol>`:
  - Pasos completados: 1 en `creada`, 2 en `pendiente_validacion`, 3 en `confirmada`.
  - Círculos de 24px. Completados: `bg-brand` con `Check` crema y un `sr-only` "completado". Pendientes: `bg-terracota-300 text-terracota-900` con su número.
  - Barras de 3px: `bg-brand` entre pasos completados, `bg-terracota-300` en el resto.
  - Labels en 13px: "Reservado", "Comprobante", "Confirmado". El paso actual va en 700 con `aria-current="step"`.
  - En `creada` la cabecera es neutral: verificar el contraste de `bg-terracota-300` sobre `bg-neutral-200`. Si no se distingue, usar `bg-neutral-400` para los pendientes.
- [x] **Contenido** (`px-[22px] pt-[18px] gap-3.5`):
  - **Card de la reserva:** `FotoCancha` de 64px `rounded-slot`, nombre en 700/17px, `formatearFechaLarga` y "18:00–19:00 · ₡14.000".
  - **Card del comprobante** (si existe): kicker "Tu comprobante", miniatura de 56×70 `rounded-[16px]` **sin washed**, y "Enviado a las HH:MM. Vence a las HH:MM si nadie responde."
  - Estado `creada`: se mantiene `ComprobanteUploader` inline, que es el camino para retomar la reserva.
  - Botón `outline` "Cancelar reserva" a todo el ancho, al pie (52px), **solo en `creada`** y siempre detrás de `ConfirmDialog`, como hoy.
  - **No** se implementa el bloque demo "Cómo se ven los otros estados".
- [x] Realtime: el canal y el toast no cambian. Se agrega `router.refresh()` cuando cambia el estado, para refrescar la URL firmada del comprobante.

### Fase 9 — Mis reservas
**Archivos:** `app/futbolero/reservas/page.tsx`, `ListaReservas.tsx`, `loading.tsx`
**Commit:** `feat(ui): mis reservas con tabs en píldora y línea de qué sigue`

- [ ] `page.tsx`: agregar `hora_fin` al select de `slots` (lectura nueva). `ReservaConDatos` suma `horaFin`.
- [ ] Título "Mis reservas" en 700/28px (`px-[22px] pt-[52px]`). `Tabs` en píldora a todo el ancho: Activas / Pasadas.
- [ ] Fila (`Link`), `rounded-card bg-card px-[18px] py-4`:
  - A la izquierda, el nombre en 700/17px y "hoy · 18:00–19:00" / "sáb 20 · 9:00–10:00" en 15px (`formatearDiaCorto`, con "hoy" y "mañana" relativos).
  - A la derecha, `EstadoReservaBadge`.
  - Línea "qué sigue" en 14px:
    - `pendiente_validacion`: "Te avisamos cuando la cancha confirme el pago." (la fila además lleva `shadow-sm`);
    - `creada`: "Falta adjuntar el comprobante.";
    - el resto, sin línea.
- [ ] Estados vacíos: se mantienen los textos actuales.
- [ ] `loading.tsx`: título, píldora de tabs y 3 filas de radio 26.

### Fase 10 — Panel del admin
**Archivos:** `app/admin/page.tsx`, `components/shared/StatCard.tsx`, `lib/admin/panel.ts` (nuevo, solo lectura)
**Commit:** `feat(ui): panel del admin con banner, métricas del día y próximos partidos`

- [ ] `lib/admin/panel.ts`: una función `datosPanel(supabase, adminId)` con lecturas nuevas. **Las definiciones van a DECISIONS.md:**
  - `reservasHoy`: reservas `confirmada` + `pendiente_validacion` cuyo `slot.fecha` = hoy (CR).
  - `ingresosHoy`: suma de `monto` de las reservas `confirmada` con `slot.fecha` = hoy. Subtítulo "confirmados".
  - `ocupacionSemana` y `rating` + `totalCalificaciones`: reusar `calcularInsights(supabase, canchaIds, 7)`.
  - Delta de "Reservas hoy" contra ayer ("+2 vs. ayer"), solo si ayer hay datos. La ocupación no lleva delta: `calcularInsights` no expone el período anterior de ocupación, y agregarlo sería tocar `lib/insights.ts`. Queda sin delta, o se decide aparte.
  - `horariosSemana` por cancha: conteo de `slots` con `fecha` en [hoy, hoy+6].
  - `proximosPartidos`: hasta 5 reservas `confirmada` con `fecha ≥ hoy`, ordenadas por fecha y hora, con el nombre del futbolero, la cancha y el monto.
  - `pendientes`: desde `contarPendientes()`.
- [ ] Encabezado:
  - Kicker con la fecha larga ("Martes 16 de setiembre").
  - "Buenas, {primer nombre}" en 700/34px.
  - `Button variant="outline"` con `Plus` "Nueva cancha" a la derecha.
- [ ] **Banner** (link a la cola):
  - Con pendientes: `bg-terracota-100 border border-terracota-300 rounded-panel px-7 py-6 gap-[22px]`.
    - Círculo de 58px `bg-brand` con `ClipboardCheck` crema.
    - Título en 700/22px `text-terracota-900`, con el plural que ya existe.
    - Bajada de 16px:
      - si `expiraMasProxima` es futuro: "El más viejo vence en N minutos. Si no respondés a tiempo, la reserva vence y el horario se libera.";
      - si ya pasó: "Hay comprobantes vencidos esperando respuesta." (ver R2).
    - `Button` "Ir a la cola".
  - Sin pendientes: `bg-sage-100 border-sage-300`, `CircleCheck`, "Estás al día".
- [ ] `StatCard`:
  - `rounded-card bg-card px-[22px] py-5 gap-1.5`, label en 14px, valor en 700/30px.
  - Subtítulo opcional (prop `detalle`, 14px `text-neutral-800`).
  - Delta con ícono y texto: si es bueno, `text-success font-semibold`; si es malo, `text-terracota-800`.
  - Soporta deltas en "pts" (prop `unidadDelta: "%" | "pts"`).
  - Rejilla: `grid-cols-2 lg:grid-cols-4 gap-4`.
- [ ] **Dos paneles** (`lg:flex`):
  - "Mis canchas" (`flex-1 bg-card rounded-panel px-6 py-[22px]`, título en 700/19px, link "Ver todas" a `/admin/canchas`). Filas `bg-background rounded-fila px-4 py-3.5`:
    - `FotoCancha` de 72×56 `rounded-thumb`;
    - nombre en 700/17px y "★ 4.8 · 12 horarios esta semana" en 14px;
    - botones `outline sm` "Info" (se mantiene porque es la única entrada a editar la cancha) y "Horarios".
  - "Próximos partidos" (`lg:w-80`): filas con la hora en 700/15px (w-13), nombre en 15/600 y "{cancha} · ₡monto" en 14px. Sin datos: "No hay partidos confirmados próximos."
- [ ] El estado vacío "Todavía no registraste ninguna cancha" se mantiene.

### Fase 11 — Cola de validaciones
**Archivos:** `app/admin/validaciones/page.tsx`, `components/ColaValidacion.tsx`, `app/admin/validaciones/loading.tsx`
**No se tocan:** las rutas `confirmar` y `rechazar`, la firma de 5 minutos ni el orden por `comprobante_subido_at`.
**Commit:** `feat(ui): cola de validaciones con ítem expandido y filtros por cancha`

- [ ] Encabezado: "Comprobantes por validar" en 700/32px y la bajada del README.
  - A la derecha, un filtro por cancha en píldora (`bg-card rounded-full p-[5px]`, opciones de 40px, activa en `bg-primary`): "Todas" + los nombres cortos.
  - Es estado de cliente y solo aparece si hay más de una cancha.
- [ ] `ItemCola` suma `canchaId` para poder filtrar (el dato ya se lee).
- [ ] **Ítem expandido** (el primero de la lista filtrada, abierto por defecto): `bg-card rounded-panel border border-terracota-300 px-[22px] py-5 gap-[22px]`, en fila en desktop y apilado en mobile.
  - Comprobante de 168×214 `rounded-[22px] object-cover` **sin washed**. Tocarlo lo abre a tamaño completo en un `Dialog`: es crucial para leer el monto.
  - Nombre en 700/20px + `Badge variant="neutral"` con la cancha.
  - "teléfono · hoy 18:00–19:00" en 15px.
  - Monto en 700/24px.
  - `ContadorExpiracion` (formato corto).
  - Nota de ayuda (`bg-background rounded-slot px-4 py-3`, ícono `Lightbulb`): "Revisá que el monto sea ₡{monto} y que la fecha de la transferencia sea reciente antes de confirmar." Es un recordatorio y no afirma que coinciden: la app no valida montos (SPEC 5.3).
  - Acciones en 52px:
    - `Button variant="success" size="lg"` "Confirmar reserva";
    - `Button variant="outline" size="lg"` "Rechazar con motivo", con `border-terracota-400 text-terracota-800`.
  - El `ConfirmDialog` de rechazo usa `components/ui/textarea` con un `<Label>` visible "Motivo del rechazo". El motivo sigue siendo obligatorio.
- [ ] **Ítems colapsados:** fila `bg-card rounded-panel px-[22px] py-[18px] gap-5`.
  - Miniatura de 74×74 `rounded-slot`.
  - Nombre en 700/18px + tag de cancha.
  - Resumen en 15px: "hoy 19:00–20:00 · ₡14.000 · vence en 24 min".
  - Botón `ghost` "Abrir" (`aria-expanded`), que expande ese ítem.
- [ ] Vacío: `EmptyState tono="positivo"`, "No hay comprobantes pendientes" / "Estás al día.", con un estilo de fondo `bg-sage-100`.
- [ ] `loading.tsx`: la misma forma (un ítem grande y dos filas).

### Fase 12 — Estadísticas
**Archivos:** `app/admin/insights/page.tsx`, `components/admin/OcupacionHeatmap.tsx`, `components/admin/IngresosTrend.tsx`
**No se tocan:** `lib/insights.ts` ni `app/api/insights/exportar`.
**Commit:** `feat(ui): estadísticas con heatmap y barras Organic`

- [ ] Encabezado:
  - "Estadísticas" en 700/32px.
  - Selector de período en píldora: links 7 / 30 / 90 días de 40px, activo en `bg-primary`, con `aria-current`. El query param no cambia.
  - `Button variant="outline"` con `Download` "Exportar CSV".
- [ ] StatCards:
  - "Ingresos confirmados" + delta ("+14% vs. período anterior").
  - "Ocupación" con detalle "de los horarios publicados".
  - "Tasa de cancelación" (`subiendoEsBueno={false}`, sin delta porque no hay dato anterior).
  - "Rating promedio" con detalle "{totalCalificaciones} calificaciones", un campo que ya existe en `DatosInsights`.
- [ ] `OcupacionHeatmap`:
  - Grilla `grid-cols-[auto_repeat(N,1fr)] gap-[5px]` a todo el ancho del panel.
  - Celdas `h-[30px] rounded-celda`.
  - Horas en 12px, días en 13px.
  - Rampa **D10** (`bg-chart-1` … `bg-chart-5`). Las celdas vacías (`chart-1`, crema) llevan `ring-1 ring-border` para que se vean sobre el arena.
  - Leyenda arriba a la derecha: "menos", 5 cuadros y "más".
  - Cada celda lleva `aria-label="Viernes 18:00: 4 reservas"` además del `title`. Un `<table className="sr-only">` equivalente es opcional.
  - **Línea de lectura** al pie (14px), **calculada con los datos** y nunca fija: "Tu franja más pedida es el {día} a las {hora}." (la celda de mayor valor). Si hay empate o muy pocos datos (menos de 5 reservas), la línea no se muestra.
  - El rango de horas es el real de los datos. El vacío conserva el texto actual.
- [ ] `IngresosTrend`:
  - SVG con `viewBox` y `width="100%"` (responsivo).
  - Barras con radio de 12px **solo arriba** (usar `<path>`, porque `rect rx` redondea las cuatro esquinas).
  - Color por magnitud en 4 pasos (`fill-terracota-300`, `-500`, `-700`, `-900`, con cortes en cuartiles de `max`).
  - Valor abreviado arriba ("486k", 12px `fill-neutral-800`), etiqueta de semana abajo (13px) y línea base `stroke-border`.
  - `aria-label` con el resumen. Se mantiene `<title>` por barra.
- [ ] "Clientes recurrentes": "{pct}% del período" a la derecha y filas "Nombre — N confirmadas".

### Fase 13 — Pantallas sin diseño, barrido y documentación
**Commit:** `feat(ui): barrido final del rediseño + docs`

- [ ] Heredan tokens y reciben ajuste de layout (contenedor, títulos 700 y `Aviso`):
  - `app/admin/canchas/nueva/page.tsx`
  - `app/admin/canchas/[canchaId]/info/page.tsx` + `InfoCanchaForm.tsx` + `components/admin/FotosCanchaUploader.tsx`
  - `app/admin/canchas/[canchaId]/slots/nueva/page.tsx` + `components/CrearSlotForm.tsx`
  - `components/admin/SelectorCancha.tsx`
  - `app/auth/set-password/page.tsx` (reemplazar `zinc`, `black`, `white` y `dark:` por los componentes `Input` y `Button`)
- [ ] Restilizar `EmptyState` (`rounded-card`, borde punteado `border-border`, ícono `text-neutral-700`, o `text-sage-700` si es positivo), `ConfirmDialog` y `RatingStars` (`fill-brand`).
- [ ] Reemplazar todos los montos y fechas por `lib/formato.ts` (D9).
- [ ] **Auditorías con grep.** Cada una debe dar 0 resultados, o cada resultado debe estar justificado en el commit:
  ```bash
  grep -rnE "#[0-9a-fA-F]{3,8}\b" app components --include=*.tsx | grep -v "themeColor"
  grep -rnE "\b(zinc|slate|gray|green|red|amber|emerald)-[0-9]" app components --include=*.tsx
  grep -rnE "\b(bg|text|border)-(white|black)\b" app components --include=*.tsx
  grep -rnE "(text|bg|border)-(warning|danger|neutral)(/[0-9]+)?\b" app components --include=*.tsx
  grep -rnE "text-\[1[0-2]px\]|text-xs" app components --include=*.tsx      # revisar que no sean interactivos
  grep -rnE "toLocaleString\(\"es-CR\"\)|toLocaleDateString\(" app components --include=*.tsx
  grep -rn "render={<Link" app components --include=*.tsx | grep -v nativeButton
  grep -rnE "washed" app components --include=*.tsx                         # ninguno sobre comprobantes
  ```
- [ ] Docs:
  - `DECISIONS.md`: entrada de cierre con las definiciones de las métricas del panel, D1–D13 y lo que quedó fuera.
  - `HANDOFF.md`: "Estado actual" y "Próximos pasos".
  - `plan-ui-ux-canchas-fut5-cr.md`: el aviso de la Fase 0 ya está.
- [ ] Recorrer la matriz de la sección 8 completa.
- [ ] Preguntarle a Julián si hace merge de `rediseno-organic` a `main` y si hace push.

---

## 6. Riesgos y hallazgos fuera de alcance (no se resuelven en este plan)

| ID | Severidad | Hallazgo | Por qué importa para el diseño | Qué haría falta |
|---|---|---|---|---|
| R1 | **Alta** | Una reserva `creada` **no tiene plazo**. `expira_at` se calcula solo al subir el comprobante, y `expirar_reservas_vencidas()` solo mira `pendiente_validacion`. Una reserva abandonada entre "Ya pagué" y la subida deja el slot `retenido` **para siempre**, hasta que el futbolero la cancele | El contador "29:41" del diseño da por hecho una retención con plazo que no existe | Migración: `expira_at` al crear, que el cron también expire las `creada` y, sobre todo, R2. Decisión de negocio |
| R2 | **Alta** | El cron corre 1 vez al día (Vercel Hobby) | El contador "Vence en N min" y "el horario se libera" no se cumplen a tiempo | Opción 1 o 2 de DECISIONS.md: cron externo cada 5 min o Vercel Pro |
| R3 | Media | La URL firmada del comprobante dura 5 minutos. El admin "vive" en la cola: después de 5 min con la página abierta, las imágenes se rompen | Hace fallar la pantalla que más se usa | Refrescar la página o las URLs periódicamente (`router.refresh()` cada ~4 min con la pestaña visible) o firmar bajo demanda. Es un cambio de comportamiento chico, a decidir |
| R4 | Alta (conocida) | Login sin verificar la identidad (DECISIONS.md) | La piel nueva lo hace ver "más terminado" de lo que es | Reactivar la autenticación real antes de operar con usuarios reales |
| R5 | Media | No hay tests ni CI. Toda la verificación es manual | Un rediseño de 30+ archivos tiene mucha superficie de regresión | Opcional: un smoke de Playwright con capturas a 390 y 1280 de las rutas de la sección 8 |
| R6 | Media | Supabase tiene un solo ambiente (producción) | Las pruebas manuales crean reservas reales que ven los admins reales | Usar las cuentas de prueba de HANDOFF.md y cancelar las reservas de prueba (solo se puede en `creada`) |

---

## 7. Datos para probar

- Usar las cuentas de prueba listadas en `HANDOFF.md` ("Cuentas de prueba" y "Simulación de puesta en producción"). Hay admins con canchas y horarios, y futboleros con reservas `confirmada` y `rechazada`.
- Para ver `creada` y `pendiente_validacion`, recorrer el flujo con un futbolero de prueba. Para subir el archivo, usar el patrón de HANDOFF.md (inyectar `File` + `DataTransfer`).
- `expirada` difícilmente se reproduce a mano por R2. Revisarla con una reserva ya expirada, si existe, o con un mock local del componente que **no se commitea**.
- Para simular que un horario se ocupó mientras el usuario miraba: abrir el paso 1 con el futbolero A, reservar el mismo slot con el futbolero B en otra sesión y recargar A.

---

## 8. Matriz de verificación final

| Ruta | 390 | 1280 | Qué verificar |
|---|---|---|---|
| `/` | ☐ | ☐ | Marca, ilustración sage, dos botones de 54px |
| `/login`, `/login?modo=crear` | ☐ | ☐ | Tarjetas de rol accesibles con teclado (flechas), errores con `Aviso`, input de 16px |
| `/futbolero/canchas` | ☐ | ☐ | Cabecera arena, buscador, chips con `aria-pressed`, orden, rejilla 2 / 3–4, precio "desde", vacíos, skeleton |
| `/futbolero/canchas/[id]` | ☐ | ☐ | Portada con contador, lámina, tags "+N", días, franjas, estados de pastilla, barra solo con selección, **horarios de esta noche después de las 18:00** (D11) |
| `…/reservar/[slotId]` | ☐ | ☐ | Paso 1, copiar, "Ya pagué" crea la reserva, horario tomado, Esc cierra |
| `…/reservar/[slotId]/comprobante` | ☐ | ☐ | Paso 2: adjunto, preparando, revisión, enviando, error + reintento, sin reserva |
| `/futbolero/reservas` | ☐ | ☐ | Tabs en píldora, filas con badge y "qué sigue", vacíos |
| `/futbolero/reservas/[id]`, en los 6 estados | ☐ | ☐ | Cabecera tintada, timeline (3 estados), cards, cancelar solo en `creada`, toast realtime |
| `/futbolero/perfil` | ☐ | ☐ | Datos + Salir |
| `/admin` | ☐ | ☐ | Sidebar/barra, contador, banner (con y sin pendientes, vencido), 4 métricas, paneles |
| `/admin/validaciones` | ☐ | ☐ | Filtro, expandido y colapsados, comprobante a tamaño completo, confirmar, rechazar con motivo, vacío |
| `/admin/insights?periodo=7\|30\|90` | ☐ | ☐ | Selector, métricas, heatmap + leyenda + línea calculada, barras, recurrentes, CSV |
| `/admin/canchas`, `/admin/horarios`, `/admin/mas` | ☐ | ☐ | Navegación D6 |
| `/admin/canchas/nueva`, `…/info`, `…/slots/nueva`, `/auth/set-password` | ☐ | ☐ | Heredan tokens, sin colores viejos |

**Accesibilidad transversal:**
- ☐ Tab completo en cada ruta, con foco visible.
- ☐ Zoom al 200% sin scroll horizontal.
- ☐ VoiceOver lee el estado de la reserva como texto.
- ☐ `prefers-reduced-motion` desactiva la animación de la hoja.
- ☐ Ningún control mide menos de 44px.
- ☐ El texto interactivo mide 16px o más.

---

## Apéndice A — Inventario de archivos por fase

| Fase | Modifica | Crea |
|---|---|---|
| 0 | `DECISIONS.md`, `plan-ui-ux-canchas-fut5-cr.md` | (rama), `design_handoff_dale_cancha/` en git |
| 0.5 | `app/futbolero/canchas/[canchaId]/page.tsx`, `app/futbolero/reservas/page.tsx` | `lib/fecha.ts` |
| 1 | `app/globals.css`, `app/layout.tsx`, `components/ui/sonner.tsx` | — |
| 2 | `components/ui/{button,input,textarea,card,badge,tabs,dialog,select,checkbox,radio-group,skeleton,label}.tsx` | `components/shared/{Marca,BotonVolver,Aviso,ChipFiltro,HojaInferior,BarraAccionInferior,ContadorExpiracion,FotoCancha,Avatar}.tsx`, `lib/formato.ts` |
| 3 | `components/NavBar.tsx`, `app/futbolero/layout.tsx`, `app/admin/layout.tsx`, `app/admin/page.tsx` (usa `contarPendientes`) | `components/BarraInferior.tsx`, `components/admin/SidebarAdmin.tsx`, `lib/admin/contarPendientes.ts`, `app/futbolero/perfil/page.tsx`, `app/admin/{canchas,horarios,mas}/page.tsx` |
| 4 | `app/page.tsx`, `app/login/LoginForm.tsx`, `components/CanchaIlustracion.tsx` | — |
| 5 | `app/futbolero/canchas/{page,ListaCanchas,loading}.tsx`, `components/shared/{CanchaCard,RatingResumen}.tsx` | — |
| 6 | `app/futbolero/canchas/[canchaId]/page.tsx`, `components/shared/{GaleriaFotos,AmenidadesGrid,SlotPicker}.tsx` | — |
| 7 | `…/reservar/[slotId]/{page,BotonCopiar}.tsx`, `…/comprobante/{page,SubirComprobante}.tsx`, `components/shared/ComprobanteUploader.tsx` | `components/shared/FondoDetalleCancha.tsx` |
| 8 | `components/shared/EstadoReservaBadge.tsx`, `components/ReservaEstado.tsx`, `app/futbolero/reservas/[reservaId]/page.tsx` | — |
| 9 | `app/futbolero/reservas/{page,ListaReservas,loading}.tsx` | — |
| 10 | `app/admin/page.tsx`, `components/shared/StatCard.tsx` | `lib/admin/panel.ts` |
| 11 | `app/admin/validaciones/{page,loading}.tsx`, `components/ColaValidacion.tsx` | — |
| 12 | `app/admin/insights/page.tsx`, `components/admin/{OcupacionHeatmap,IngresosTrend}.tsx` | — |
| 13 | Pantallas admin sin diseño, `app/auth/set-password/page.tsx`, `components/shared/{EmptyState,ConfirmDialog,RatingStars}.tsx`, `components/admin/{FotosCanchaUploader,SelectorCancha}.tsx`, `components/CrearSlotForm.tsx`, `HANDOFF.md`, `DECISIONS.md` | — |

**No se tocan en ninguna fase:** `app/**/actions.ts`, `app/api/**`, `app/auth/callback/**`, `app/register/page.tsx`, `supabase/**`, `proxy.ts`, `lib/supabase/**`, `lib/insights.ts`, `lib/comprimirImagen.ts`, `lib/obtenerUrlComprobanteFirmada.ts`, `lib/amenidades.ts`, `lib/types/database.ts`, `vercel.json`.
