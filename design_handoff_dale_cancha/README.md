# Handoff: Dale Cancha — rediseño de UI/UX

## Overview

Dale Cancha es una PWA de reservas de canchas de fútbol 5 en Costa Rica con
pago manual por SINPE Móvil y validación humana del comprobante. Este paquete
documenta el rediseño completo de su interfaz: ocho pantallas de Futbolero
(mobile, 390×844) y tres de AdminCancha (escritorio, 1280×832).

El rediseño no cambia el producto ni el flujo de pago. Cambia la piel (paleta
cálida, tipografía única, formas redondeadas), la navegación (barra inferior en
mobile, sidebar en escritorio), la densidad de la búsqueda (rejilla de dos
columnas con filtros por amenidad), la lectura de horarios (agrupados en
franjas de mañana, tarde y noche) y fusiona el resumen de pago con la subida
del comprobante en una sola hoja inferior.

## About the design files

Los archivos de este bundle son **referencias de diseño hechas en HTML**:
prototipos que muestran la apariencia y el comportamiento buscados, no código
de producción para copiar. La tarea es **recrear estos diseños dentro del
codebase existente** (Next.js App Router + TypeScript + Tailwind v4 +
shadcn/ui sobre Supabase), usando sus patrones y componentes actuales.

- `Dale Cancha.dc.html` — el prototipo. Contiene dos turnos: el **Turno 2
  (id `2a`) es la dirección aprobada**; el Turno 1 (`1a`, `1b`, `1c`) son
  exploraciones descartadas, solo contexto histórico.
- `organic-styles.css` — la hoja de tokens del sistema visual Organic, de
  donde salen todos los valores de este documento.
- `PROMPT.md` — el prompt listo para pegar en Claude Code.

## Fidelity

**Alta fidelidad.** Colores, tipografía, tamaños, radios y copy son
definitivos. Recreálos con precisión usando los componentes de shadcn/ui que
ya existen en `components/ui/`, ajustando sus variantes en vez de reescribir.

## Design tokens

Paleta (reemplaza la verde/slate actual de `app/globals.css`):

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#f5ead8` | Fondo general (crema) |
| `--card` / superficie | `#ebddc5` | Cards, barras, inputs (arena) |
| `--foreground` | `#201e1d` | Texto principal |
| `--primary` | `#c67139` | Acción principal, selección (terracota) |
| `--primary-hover` | `#b2622d` | Hover de primary |
| `--primary-active` | `#8c491a` | Pressed de primary |
| `--accent-2` | `#7a8a5e` | Segunda voz, confirmado (sage) |
| `--divider` | `#201e1d` al 16% | Bordes y separadores |

Ramps (100→900), usadas para rellenos tintados y texto sobre ellos:

- neutral: `#f9f4ed` `#eee7db` `#dcd3c4` `#c0b6a5` `#a19786` `#82796a`
  `#645c50` `#474238` `#2e2b25`
- terracota: `#fff2eb` `#ffe1d0` `#ffc6a5` `#f6a06b` `#d67f48` `#b2622d`
  `#8c491a` `#643312` `#402310`
- sage: `#f0fae1` `#e1eecc` `#ccdbb2` `#aebf92` `#8fa073` `#728157` `#56633f`
  `#3d472b` `#272e1b`

Regla de contraste: sobre el fondo crema, el texto de párrafo en color de
acento usa el paso 700 o más oscuro (`#8c491a`), nunca el acento base. Sobre
relleno neutral-200 el texto usa neutral-800.

Estados de `Reserva` (único punto de verdad, como hoy en
`EstadoReservaBadge.tsx`; siempre color + ícono + texto):

| Estado | Relleno | Texto/ícono | Etiqueta | Ícono lucide |
| --- | --- | --- | --- | --- |
| `creada` | `#eee7db` | `#474238` | Esperando pago | `clock` |
| `pendiente_validacion` | `#ffe1d0` | `#402310` | En revisión | `hourglass` |
| `confirmada` | `#e1eecc` | `#272e1b` | Confirmada | `circle-check` |
| `rechazada` | `#ffe1d0` | `#402310` | Rechazada | `circle-x` |
| `expirada` | `#eee7db` | `#474238` | Expirada | `timer-off` |
| `cancelada` | `#eee7db` | `#474238` | Cancelada | `circle-slash-2` |

Tipografía: **Figtree** como única familia, vía `next/font/google`.
Títulos en 700 con `letter-spacing: -0.02em` (los grandes, -0.025em); cuerpo
en 400; labels y precios en 600/700. Escala usada: 34 / 30 / 28 / 27 / 25 /
22 / 21 / 19 / 17 / 16 / 15 / 14 / 13 / 12 / 11px. **16px es el mínimo para
texto interactivo**; 11–13px solo para kickers en mayúsculas y metadatos.

Espaciado: escala 4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2px. Padding lateral en
mobile 20–22px; en escritorio 34px vertical y 40px horizontal.

Radios: contenedores 26–28px, pastillas y botones 999px, chips de heatmap 9px,
frame de teléfono 34px. Sin esquinas rectas.

Sombras: `0 1px 2px rgba(46,43,37,.14)` / `0 3px 10px rgba(46,43,37,.16)` /
`0 12px 32px rgba(46,43,37,.22)`.

Íconos: lucide-react (ya instalado) con `stroke-width: 2.75`. 20px en línea
con texto, 24px en la barra inferior, 15px en badges.

Imágenes: toda foto de cancha lleva el tratamiento "washed"
(`filter: saturate(.6) contrast(.85) brightness(1.1) opacity(.94)`) y esquinas
redondeadas. Donde no hay foto, la ilustración vectorial de cancha (ver
`components/CanchaIlustracion.tsx`) se recolorea a sage `#7a8a5e` con líneas
crema al 50%.

## Navegación

- **Futbolero, mobile:** barra inferior fija, tres ítems — Buscar
  (`search`), Mis reservas (`calendar`), Perfil (`user`). Fondo arena, borde
  superior divider, 10px de padding arriba y 26px abajo (safe area), ítem
  activo en terracota 700 con label en 700.
- **Futbolero, ≥768px:** el header actual de `NavBar.tsx` rediseñado; la barra
  inferior se oculta.
- **AdminCancha, escritorio:** sidebar fijo de 252px, fondo arena, ítems en
  píldora de 46px (Panel, Validaciones, Horarios, Canchas, Estadísticas) con
  el activo en relleno terracota y texto crema. Validaciones lleva un contador
  numérico a la derecha. Abajo, la ficha del usuario en una píldora.
- **AdminCancha, mobile:** barra inferior de cuatro ítems (Panel,
  Validaciones, Horarios, Más).

## Screens / Views

Todas las pantallas de Futbolero se diseñaron a 390×844. Las medidas de alto
son indicativas; el contenido scrollea.

### 1. Entrada (`app/page.tsx`)

Propósito: presentar el producto a quien no tiene sesión.
Layout: columna con padding 52/26/34px, distribuida en tres bloques
(marca arriba, contenido al centro, acciones abajo).
Componentes: marca (círculo terracota de 34px con ícono, más "Dale Cancha" en
700/19px); ilustración de cancha en un contenedor de radio 32px con sombra
media; título "Reservá tu cancha de fut5" en 700/34px a dos líneas; párrafo
"Elegí horario, pagá por SINPE Móvil y seguí el estado de tu reserva en vivo."
en 17px neutral-800; botón primario "Entrar" (54px de alto, píldora) y
secundario "Crear cuenta" (54px, borde divider).

### 2. Entrar (`app/login/`)

Propósito: iniciar sesión con correo y contraseña.
Layout: botón de volver circular de 44px, título "Entrá a tu cuenta" en
700/30px, subtítulo, dos campos y el bloque de acción abajo.
Componentes: inputs de 52px de alto, fondo arena, radio 999px, padding
horizontal 14px, label de 14px encima; enlace "Olvidé mi contraseña" en
terracota 700/15px/600; botón primario "Entrar" a todo el ancho; pie
"¿No tenés cuenta? **Creá una**".
Errores: mensaje bajo el campo, en terracota 900 sobre relleno terracota 100.

### 3. Crear cuenta (`app/register/`)

Propósito: registro con selección de rol.
Componentes: dos tarjetas de rol apiladas, 60px de alto mínimo, radio 24px —
"Quiero jugar / Buscar canchas y reservar" y "Tengo una cancha / Publicar
horarios y cobrar"; la seleccionada lleva borde terracota de 2px, relleno
terracota 100 y un radio-dot de 22px lleno. Debajo, campos Nombre, Correo,
Contraseña (mínimo 8 caracteres) y botón "Crear cuenta".

### 4. Buscar (`app/futbolero/canchas/`)

Propósito: encontrar una cancha.
Layout: cabecera arena con esquinas inferiores de 32px (padding 52/20/16px),
fila de resultados, rejilla de dos columnas, barra inferior.
Componentes:
- Cabecera: marca + avatar circular de 36px (iniciales sobre sage 300);
  buscador de 50px con ícono `search` y placeholder "Buscá por cancha o zona";
  chips de filtro de 42px en scroll horizontal — "Cerca de mí" activo
  (terracota, texto crema, 700), luego Techada, Parqueo, Duchas con borde
  divider. Las claves de amenidad ya existen en `lib/amenidades.ts`.
- Fila de resultados: "14 canchas" a la izquierda; a la derecha el orden
  ("Mejor calificadas" + `chevron-down`) en terracota 700.
- Card de cancha (reemplaza `CanchaCard.tsx`): radio 26px, sombra sm, foto de
  96px arriba (washed) y cuerpo de 12/14/14px con nombre en 700/15px, línea
  meta "★ 4.8 · 1,2 km" en 13px neutral-800 (la estrella es `star` relleno en
  terracota, 12px) y precio en 700/15px. La distancia solo si hay
  geolocalización; si no, mostrar la descripción en una línea.
- Vacíos: reusar `EmptyState` con los textos actuales.

### 5. Detalle y horarios (`app/futbolero/canchas/[canchaId]/`)

Propósito: ver la cancha y elegir horario.
Layout: foto de portada de 196px con botón de volver y contador "1 / 4";
lámina de contenido que sube 26px sobre la foto con radio superior de 32px.
Componentes:
- Título en 700/25px, línea de rating y ubicación en 15px.
- Amenidades como tags sage (relleno `#f0fae1`, texto `#3d472b`) de 13px con
  ícono de 15px, más un tag neutral "+2" si hay más.
- Selector de día: pastillas de 56px de ancho en scroll horizontal, con el día
  abreviado en 12px sobre el número en 700/19px; la activa en terracota.
- Horarios agrupados por franja con un kicker en mayúsculas de 11px
  (Mañana / Tarde / Noche); la franja de noche lleva el kicker en terracota
  700 y el texto "Noche · la más pedida". Cada horario es una pastilla de
  100×48px con la hora en 700/15px y el precio en 12px; disponible = arena con
  borde divider, seleccionado = relleno terracota con texto crema y sombra sm,
  ocupado = relleno neutral-200, texto neutral-800 y la etiqueta
  "19:00 · Ocupado"; bloqueado = igual pero "No disponible".
- Barra inferior fija con borde superior divider: a la izquierda el horario
  elegido en 13px sobre el precio en 700/20px; a la derecha el botón primario
  "Continuar" (54px). La barra aparece solo cuando hay selección — seleccionar
  nunca navega solo.

### 6. Pago SINPE como hoja (`.../reservar/[slotId]/`)

Propósito: mostrar el número SINPE, el monto y recibir el comprobante sin
sacar al usuario del contexto. **Fusiona la pantalla de resumen con la de
subida**; la lógica de `confirmarPago` y `ComprobanteUploader` no cambia.
Layout: el detalle queda detrás con `blur(1px)`, opacidad 50% y un velo
neutral-900 al 42%. La hoja sube desde abajo: radio superior de 34px, sombra
lg, padding 14/22/30px, gap de 14px, con un asa de 44×5px centrada.
Componentes:
- Encabezado: "Pagá por SINPE Móvil" en 700/21px, subtítulo con cancha y
  horario en 14px, y a la derecha el contador de retención como tag terracota
  ("29:41" con ícono `clock`) — cuenta los 30 minutos configurables de la
  ventana de retención.
- Bloque del número: relleno terracota 100, radio 26px, kicker "NÚMERO SINPE"
  en 11px terracota 800, el número en 700/26px terracota 900 y el botón
  "Copiar" (44px, fondo crema, borde terracota 300, ícono `copy`).
- Fila "Monto a transferir" con el valor en 700/24px.
- Fila de adjunto: arena, radio 26px, cuadro de 52px radio 18px con ícono
  `camera`, texto "Adjuntar comprobante / Foto o captura del SINPE". Abre el
  input de archivo con `capture="environment"`.
- Aviso de estado en 14px: "Todavía no está confirmada: la cancha revisa el
  comprobante y te avisamos acá mismo."
- Botón primario "Enviar comprobante" (54px, ancho completo).
- Si el slot se ocupó mientras el usuario miraba, la hoja se reemplaza por el
  mensaje actual ("Este horario ya no está disponible") con el botón "Ver
  otros horarios".

### 7. Comprobante enviado / revisión previa

Propósito: confirmar que la captura se lee antes de enviarla.
Componentes: título "Revisá que se lea el monto" en 700/27px, bajada "Así el
dueño de la cancha lo valida de una."; preview de la imagen a 300px de alto
con radio 26px; fila de acciones con un botón secundario cuadrado de 52px
(ícono `rotate-ccw`, elegir otra) y el primario "Enviar comprobante"; aviso
sage: "Si se corta la señal lo reintentamos solo. No pierdas la imagen: queda
guardada acá." — corresponde a los tres reintentos que ya implementa
`ComprobanteUploader`.
Estados: comprimiendo → "Preparando imagen…", subiendo → "Enviando…", error →
"Reintentar envío" con el mensaje de red debajo, sin perder el archivo.

### 8. Estado de la reserva (`app/futbolero/reservas/[reservaId]/`)

Propósito: decir sin ambigüedad en qué punto está la reserva.
Layout: cabecera tintada con el color del estado (radio inferior 32px, padding
52/22/20px) y contenido en crema debajo.
Componentes:
- Cabecera: círculo de 52px con el ícono del estado, nombre del estado en
  700/22px y una línea de qué sigue ("Confirman en menos de 30 min").
- Línea de tiempo de tres pasos (Reservado / Comprobante / Confirmado):
  círculos de 24px, los cumplidos en terracota con `check`, el pendiente en
  terracota 300 con su número, unidos por barras de 3px. Los estados
  rechazada, expirada y cancelada no muestran la línea.
- Card de la reserva: foto de 64px radio 20px, nombre en 700/17px, fecha
  larga en español y "18:00–19:00 · ₡14.000".
- Card del comprobante: kicker, miniatura de 56×70px y "Enviado a las 17:32.
  Vence a las 18:02 si nadie responde."
- Botón secundario "Cancelar reserva" a todo el ancho, solo en estado
  `creada`, y siempre detrás del `ConfirmDialog` actual.
- Realtime: el canal de Supabase ya existente actualiza el estado sin recargar
  y dispara el toast "Tu reserva pasó a: …".

### 9. Mis reservas (`app/futbolero/reservas/`)

Propósito: historial y seguimiento.
Componentes: título "Mis reservas" en 700/28px; tabs Activas / Pasadas dentro
de una píldora arena con 5px de padding (la activa en terracota, 42px de
alto); filas de 26px de radio con nombre en 700/17px, fecha y hora en 15px, y
el badge de estado a la derecha. La fila en revisión añade una línea de 14px
"Te avisamos cuando la cancha confirme el pago." y lleva sombra sm.

### 10. Panel del admin (`app/admin/page.tsx`)

Propósito: saber qué hay que hacer hoy.
Layout: sidebar 252px + contenido con padding 34/40px y gap de 26px.
Componentes:
- Encabezado: kicker con la fecha larga y saludo "Buenas, Luis" en 700/34px;
  botón secundario "Nueva cancha" con ícono `plus`.
- Banner de validaciones: relleno terracota 100, borde terracota 300, radio
  28px, círculo de 58px con ícono `clipboard-check`, título "3 comprobantes
  por validar" en 700/22px, bajada "El más viejo vence en 12 minutos. Si no
  respondés, el horario se libera solo." y botón primario "Ir a la cola". Sin
  pendientes: relleno sage 100 y "Estás al día".
- Cuatro StatCards (radio 26px, arena): Reservas hoy, Ingresos de hoy,
  Ocupación de la semana, Rating promedio — label 14px, valor 700/30px, delta
  en sage 700/600 cuando sube y es bueno.
- "Mis canchas": filas crema radio 24px con miniatura de 72×56px, nombre en
  700/17px, "★ 4.8 · 12 horarios esta semana" y botón secundario "Horarios".
- "Próximos partidos": lista de hora en 700 + nombre + cancha y monto.

### 11. Cola de validaciones (`app/admin/validaciones/`)

Propósito: confirmar o rechazar comprobantes rápido; es la pantalla donde el
admin vive.
Componentes:
- Encabezado con título en 700/32px y bajada "Ordenados por el que vence
  primero. Confirmá para apartar el horario; rechazá y se libera."; a la
  derecha, filtro por cancha en píldoras.
- Item expandido (el primero de la cola): radio 28px, borde terracota 300,
  comprobante a 168×214px con radio 22px, nombre en 700/20px con un tag
  neutral de la cancha, teléfono y horario en 15px, monto en 700/24px y el
  contador de expiración como tag terracota "Vence en 12 min" (en sage cuando
  faltan más de 20 minutos, y "Venciendo…" cuando llega a cero). Nota de
  ayuda en una caja crema radio 20px. Acciones: "Confirmar reserva" en sage
  600 con texto crema y "Rechazar con motivo" secundario con borde terracota
  400 — el rechazo sigue exigiendo motivo en el `ConfirmDialog`.
- Items colapsados: fila de 74px con miniatura, nombre, tag de cancha, resumen
  y enlace "Abrir".
- La URL del comprobante sigue siendo firmada y expira a los 5 minutos.

### 12. Estadísticas (`app/admin/insights/`)

Propósito: entender ocupación e ingresos.
Componentes:
- Encabezado con título, selector de período en píldoras (7 / 30 / 90 días,
  activo en terracota) y botón secundario "Exportar CSV" con ícono `download`.
- Cuatro StatCards: Ingresos confirmados (₡1.842.000, "+14% vs. período
  anterior" en sage 700), Ocupación (68%), Tasa de cancelación (6%, donde
  bajar es bueno), Rating promedio (4.6 de 38 calificaciones).
- Heatmap de ocupación: grilla `auto repeat(8, 1fr)` con gap de 5px, filas Lun
  a Dom y columnas por hora (15–22 h por defecto, o el rango real de los
  datos). Celdas de 30px de alto, radio 9px, rampa secuencial de cinco pasos:
  neutral-200 → terracota 200 → 300 → 400 → terracota base. Una línea de
  lectura al pie ("Viernes de 6 a 9 p.m. es tu franja más pedida…"). Vacío:
  el texto actual del componente.
- Ingresos por semana: barras verticales con radio 12px arriba, en pasos de la
  rampa terracota según magnitud, valor abreviado encima ("486k") y etiqueta
  de semana debajo, sobre una línea base divider.
- Clientes recurrentes: porcentaje del período y las filas de nombre +
  "N confirmadas".

## Interactions & behavior

- Seleccionar un horario resalta la pastilla y revela la barra inferior; nunca
  navega solo. Cambiar de selección no cuesta un paso atrás.
- "Continuar" crea la `Reserva` y abre la hoja de pago sobre el detalle.
- El contador de retención de 30 minutos corre en la hoja de pago, en la
  pantalla de estado y en cada item de la cola del admin.
- Subir comprobante: comprime, muestra preview, y ante 5xx o caída de red
  reintenta hasta tres veces con backoff (1s, 2s) sin perder el archivo.
- La pantalla de estado y la cola se actualizan por realtime de Supabase, con
  toast al cambiar de estado. Nunca se muestra el valor crudo del enum.
- Hover/pressed de todo control interactivo: terracota 600 / 700 en fondos
  claros; foco de teclado `outline: 2px solid #c67139` con `outline-offset: 2px`.
- Responsive: la barra inferior es solo mobile; a partir de 768px vuelve el
  header y la búsqueda pasa a tres o cuatro columnas. El admin conserva el
  sidebar desde 1024px.
- Skeletons con la forma del componente real (ya existen los `loading.tsx`).

## State management

Sin cambios respecto de lo implementado: estado de selección de día y horario
en `SlotPicker`; estado del archivo, la compresión y el reintento en
`ComprobanteUploader`; suscripción realtime y estado de la reserva en
`ReservaEstado`; `useTransition` + `router.refresh()` tras confirmar o
rechazar en la cola; período por query param en estadísticas. Las mutaciones
siguen siendo server actions y rutas de API existentes.

## Assets

- Íconos: lucide-react, ya instalado. Los usados son `search`, `sliders`,
  `star`, `map-pin`, `chevron-left`, `chevron-down`, `chevron-right`, `clock`,
  `hourglass`, `check`, `circle-check`, `circle-x`, `timer-off`,
  `circle-slash-2`, `camera`, `copy`, `rotate-ccw`, `calendar`, `user`,
  `clipboard-check`, `lightbulb`, `umbrella`, `car`, `plus`, `download`,
  `bar-chart`, `lock`, `info`.
- Fotos de cancha: en el prototipo son placeholders para soltar imágenes; en
  producción vienen de Supabase Storage (`fotos-cancha`), con el tratamiento
  washed.
- Ilustración de cancha: `components/CanchaIlustracion.tsx`, recoloreada a
  sage.
- Fuente: Figtree (Google Fonts) vía `next/font/google`.

## Files

- `Dale Cancha.dc.html` — prototipo de las once pantallas (usar el bloque del
  Turno 2, id `2a`).
- `organic-styles.css` — tokens del sistema visual de referencia.
- `PROMPT.md` — prompt de implementación para Claude Code.

En el repo, los archivos a modificar son los listados en el orden de
implementación de `PROMPT.md`.
