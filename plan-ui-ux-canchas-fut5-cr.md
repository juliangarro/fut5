# Especificación de UI/UX — App de Reservas para Canchas de Fútbol 5 (Costa Rica)

> **Audiencia: agentes de IA (Claude Code) que implementarán la interfaz.** Este documento es complementario a `plan-app-canchas-fut5-cr.md` (especificación funcional/técnica) — usa las mismas entidades (`Reserva`, `Slot`, `Comprobante`, `Cancha`, `Futbolero`, `AdminCancha`) y la misma máquina de estados de `Reserva` definida ahí. No repitas lógica de negocio aquí; este documento cubre exclusivamente interfaz, interacción y sistema visual.

---

## 0. Cómo usar este documento

- Cada pantalla se describe con: propósito, layout, elementos, estados (carga/vacío/error), acciones disponibles y hacia dónde navega cada acción. Esto es suficiente para implementar sin inventar estructura adicional.
- El Sistema de Diseño (Sección 2) es la fuente de verdad para tokens visuales — no introducir colores, tipografías o espaciados fuera de esa paleta sin necesidad justificada.
- Este proyecto usa **Next.js + Tailwind CSS + shadcn/ui** como base de componentes (ver Sección 11). Preferir extender componentes de shadcn/ui sobre construir desde cero.
- Cuando una pantalla no especifique un detalle (ej. copy exacto de un botón), el agente tiene libertad de completar siguiendo el tono definido en 1.3, pero debe mantener consistencia con el resto de la app.

---

## 1. Principios de diseño

### 1.1 Mobile-first, siempre

El `Futbolero` usa la app casi exclusivamente desde el celular, a menudo con conexión inestable fuera de zonas urbanas. Toda pantalla se diseña primero para viewport de ~375-414px de ancho, y se expande a tablet/desktop después (ver Sección 8). El `AdminCancha` puede usar tablet o desktop con más frecuencia (revisando comprobantes o el dashboard desde una oficina), pero ninguna pantalla debe depender de un layout de escritorio para ser usable.

### 1.2 Claridad de estado por encima de todo

El mayor riesgo de UX del producto es la confusión sobre si una reserva está realmente confirmada (ver Sección 5 del documento funcional — el pago es manual). Cada pantalla que muestre una `Reserva` debe comunicar su estado sin ambigüedad: color, ícono y texto explícito juntos, nunca solo color. Nunca mostrar un `Slot` como "reservado" de forma indistinguible entre `pendiente_validacion` y `confirmada`.

### 1.3 Tono de contenido (copy)

- Español de Costa Rica, cercano pero profesional ("tu reserva", "subí tu comprobante" — voseo/tuteo simple, no formal "usted").
- Mensajes de error y de estado siempre explican el siguiente paso ("Tu comprobante está en revisión. El administrador de la cancha lo confirma en los próximos 30 minutos." en vez de solo "Pendiente").
- Nunca usar jerga técnica en la interfaz de usuario final (no decir "slot", decir "horario"; no decir "estado: expired", decir "Esta reserva venció porque no se confirmó a tiempo").

### 1.4 Fricción mínima en el camino crítico

El camino crítico del negocio es: buscar cancha → elegir horario → pagar → subir comprobante. Cada paso adicional en ese camino (campos opcionales, pantallas de confirmación redundantes) debe justificarse explícitamente o eliminarse.

---

## 2. Sistema de diseño (design tokens)

### 2.1 Paleta de color

Paleta semántica neutra, pensada para modo claro (modo oscuro es opcional post-MVP, no bloqueante).

| Token | Uso | Valor sugerido |
|---|---|---|
| `--color-primary` | Acciones principales, links, elementos de marca | `#16A34A` (verde cancha — coherente con fútbol, no literal césped) |
| `--color-primary-hover` | Hover/active de primary | `#15803D` |
| `--color-secondary` | Acciones secundarias | `#0F172A` (slate oscuro) |
| `--color-success` | `Reserva confirmada` | `#16A34A` |
| `--color-warning` | `Reserva pendiente_validacion` | `#D97706` |
| `--color-danger` | `Reserva rechazada`, acciones destructivas | `#DC2626` |
| `--color-neutral` | `Reserva expirada`/`cancelada`, texto secundario | `#64748B` |
| `--color-bg` | Fondo general | `#F8FAFC` |
| `--color-surface` | Cards, modales | `#FFFFFF` |
| `--color-border` | Bordes, separadores | `#E2E8F0` |
| `--color-text` | Texto principal | `#0F172A` |
| `--color-text-muted` | Texto secundario | `#64748B` |

Regla dura: el color de estado de una `Reserva` es siempre el mismo en toda la app (badge, notificación, dashboard). No reinterpretar `warning` como otra cosa en otra pantalla.

### 2.2 Tipografía

- Familia: system font stack o **Inter** (buena legibilidad en pantallas pequeñas, gratuita, carga rápida vía `next/font`).
- Escala: `text-xs` (12px) → `text-sm` (14px, cuerpo secundario) → `text-base` (16px, cuerpo default — nunca menor a esto en texto interactivo, por accesibilidad táctil) → `text-lg` (18px) → `text-xl` (20px, títulos de card) → `text-2xl` (24px, títulos de pantalla) → `text-3xl` (30px, solo landing/hero si aplica).
- Peso: `font-normal` cuerpo, `font-medium` labels y botones, `font-semibold` títulos.

### 2.3 Espaciado

Escala base 4px (estándar Tailwind: `1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px, 12=48px`). Padding mínimo de contenedor en mobile: `16px` (`px-4`). Separación entre secciones de una pantalla: `24-32px`.

### 2.4 Radios, sombras, bordes

- Radio de card/botón: `rounded-xl` (12px) — visualmente amigable, no corporativo-cuadrado.
- Radio de badge/pill: `rounded-full`.
- Sombra de card: sutil, `shadow-sm`, nunca sombras pesadas.
- Modales: `shadow-lg` + overlay `bg-black/50`.

### 2.5 Íconos

Librería: `lucide-react` (integra directo con shadcn/ui). Tamaño default `20px` en línea con texto, `24px` en botones standalone, `16px` en badges.

### 2.6 Tamaño mínimo de objetivo táctil

Todo elemento interactivo (botón, link, checkbox) ≥ `44x44px` de área táctil, sin excepción — es mobile-first y muchos usuarios lo usarán con una mano mientras están en la cancha.

---

## 3. Arquitectura de información

### 3.1 Mapa de navegación — Futbolero

```
/login, /registro
  → /buscar (home autenticado)
      → /cancha/[id] (detalle + calendario)
          → /cancha/[id]/reservar/[slotId] (resumen + pago SINPE)
              → /cancha/[id]/reservar/[slotId]/comprobante (subir imagen)
                  → /reservas/[reservaId] (pantalla de estado, destino tras subir)
  → /reservas (historial, tabs: activas / pasadas)
      → /reservas/[reservaId]
          → /reservas/[reservaId]/calificar (solo si confirmada y jugada)
  → /perfil
```

### 3.2 Mapa de navegación — AdminCancha

```
/login, /registro-negocio
  → /admin (dashboard resumen — landing tras login)
  → /admin/canchas (si tiene más de una cancha, selector; si tiene una, redirige directo a su gestión)
      → /admin/canchas/[id]/horarios (gestión de slots)
      → /admin/canchas/[id]/info (CRUD de cancha: fotos, amenidades, número SINPE, política)
  → /admin/validaciones (cola de pagos pendientes — probablemente la pantalla más visitada, considerar acceso directo desde nav principal)
  → /admin/insights (dashboard de métricas)
  → /admin/perfil
```

### 3.3 Navegación principal (tab bar / nav)

**Futbolero (mobile — bottom tab bar, 4 ítems):** Buscar · Mis Reservas · (acción central opcional: no aplica, no hay FAB necesario ya que "reservar" nace desde Buscar) · Perfil. Usar 3 tabs si se prefiere simplicidad: Buscar, Mis Reservas, Perfil.

**AdminCancha (mobile — bottom tab bar, 4 ítems):** Dashboard · Validaciones · Horarios · Perfil/Más. En desktop/tablet, convertir a sidebar lateral fijo con los mismos ítems más "Insights" y "Canchas" visibles directamente (no ocultos en "Más").

---

## 4. Componentes reutilizables (inventario)

Construir estos como componentes compartidos antes de construir pantallas — evita duplicar lógica visual.

| Componente | Uso | Notas |
|---|---|---|
| `EstadoReservaBadge` | Badge de estado (`pendiente_validacion`, `confirmada`, `rechazada`, `expirada`, `cancelada`) | Único punto de verdad para color+ícono+texto por estado (ver 2.1). Cualquier pantalla que muestre estado de reserva usa este componente, nunca un badge ad-hoc |
| `CanchaCard` | Card de cancha en listas de búsqueda | Foto, nombre, rating (estrellas + número), precio desde, distancia si hay geolocalización |
| `SlotPicker` | Calendario/grid de horarios disponibles | Ver detalle en 4.1 |
| `ComprobanteUploader` | Subida de imagen de comprobante SINPE | Preview antes de confirmar envío, barra de progreso, manejo de error de red con reintento |
| `RatingStars` | Mostrar o capturar calificación 1-5 | Modo lectura (dashboard, card) y modo input (formulario de calificar) |
| `StatCard` | Tarjeta de métrica individual en dashboard admin | Número grande + label + variación (↑/↓ vs período anterior) |
| `EmptyState` | Estado vacío genérico | Ilustración simple/ícono + mensaje + acción sugerida (ver 7.2) |
| `ConfirmDialog` | Confirmación de acción destructiva (cancelar reserva, rechazar comprobante, eliminar horario) | Nunca ejecutar una acción destructiva sin este componente |
| `Toast` | Feedback de acción (éxito/error) | shadcn/ui `sonner` o equivalente |
| `Skeleton` | Loading state de cards/listas | Usar shape del componente real, no un spinner genérico, para listas |

### 4.1 `SlotPicker` — detalle de comportamiento

- Vista por día (selector de fecha tipo tabs horizontales scrolleables: hoy, mañana, +7 días) con los `Slot`s de ese día en una lista vertical de horarios.
- Cada `Slot` muestra: hora inicio-fin, precio, estado visual (disponible = seleccionable; retenido/reservado = deshabilitado con texto "Ocupado"; bloqueado = deshabilitado con texto "No disponible").
- Al seleccionar un `Slot` disponible, resaltar visualmente y mostrar un botón fijo inferior ("Continuar con este horario") — no navegar automáticamente al tocar, para permitir cambiar de selección sin fricción.

---

## 5. Pantallas — Futbolero

Para cada pantalla: propósito · elementos clave · estados · acciones → destino.

### 5.1 Login / Registro

- **Propósito:** autenticar o crear cuenta.
- **Elementos:** logo, campos email/password, botón primario "Entrar", separador "o", botones OAuth (Google), link "¿No tenés cuenta? Registrate".
- **Estados:** error de credenciales inválidas (mensaje inline bajo el campo, no solo toast), loading en botón mientras autentica.
- **Acciones:** login exitoso → `/buscar`. Registro exitoso → `/buscar` (onboarding mínimo, sin steps adicionales en MVP).

### 5.2 Buscar canchas (`/buscar`)

- **Propósito:** descubrir canchas disponibles.
- **Elementos:** barra de búsqueda/filtro por ubicación arriba (fija), lista de `CanchaCard` debajo. Filtros mínimos: distancia, precio, rating mínimo (como chips horizontales, no modal, para no interrumpir el flujo).
- **Estados:** loading (skeleton de 3-4 `CanchaCard`), vacío (ninguna cancha en la zona — `EmptyState` con sugerencia de ampliar radio de búsqueda), error de geolocalización denegada (fallback a selector manual de provincia/cantón).
- **Acciones:** tap en card → `/cancha/[id]`.

### 5.3 Detalle de cancha (`/cancha/[id]`)

- **Propósito:** mostrar toda la información antes de reservar y el calendario de horarios.
- **Elementos:** carrusel de fotos, nombre, rating promedio + cantidad de reseñas, amenidades (ícono + label en grid), política de cancelación (texto colapsable "Ver política"), ubicación (mapa estático o link a Google Maps), `SlotPicker`.
- **Estados:** loading, error si la cancha no existe/fue removida (redirige a `/buscar` con mensaje).
- **Acciones:** seleccionar `Slot` + "Continuar" → `/cancha/[id]/reservar/[slotId]`.

### 5.4 Resumen de reserva y pago (`/cancha/[id]/reservar/[slotId]`)

- **Propósito:** confirmar detalles antes de pagar, mostrar instrucciones SINPE.
- **Elementos:** resumen (cancha, fecha, hora, precio), bloque destacado con número SINPE de la cancha y monto exacto (copiable con un tap — botón "Copiar número"), instrucción explícita: "1. Hacé la transferencia SINPE por ₡X al número de arriba. 2. Subí el comprobante en el siguiente paso.", botón primario "Ya pagué, subir comprobante".
- **Estados:** el `Slot` puede haber sido tomado por otro usuario mientras se decidía → error claro ("Este horario ya no está disponible") con botón para volver al calendario.
- **Acciones:** "Ya pagué..." → `/cancha/[id]/reservar/[slotId]/comprobante`. Esto crea la `Reserva` en estado `creada`.

### 5.5 Subir comprobante (`/cancha/[id]/reservar/[slotId]/comprobante`)

- **Propósito:** capturar el `Comprobante`.
- **Elementos:** `ComprobanteUploader` (tomar foto o elegir de galería), preview de la imagen antes de enviar, botón "Enviar comprobante".
- **Estados:** subiendo (barra de progreso, deshabilitar botón), error de red (reintento sin perder la imagen seleccionada), éxito.
- **Acciones:** envío exitoso → `Reserva` pasa a `pendiente_validacion`, navega a `/reservas/[reservaId]`.

### 5.6 Estado de reserva (`/reservas/[reservaId]`)

- **Propósito:** mostrar el estado actual y detalle de una reserva específica — pantalla central del "camino crítico".
- **Elementos:** `EstadoReservaBadge` prominente arriba, detalle de cancha/fecha/hora/monto, línea de tiempo simple del proceso (Reservado → Comprobante subido → Confirmado), bloque contextual según estado:
  - `pendiente_validacion`: "El administrador de la cancha está revisando tu comprobante. Normalmente confirma en menos de 30 minutos." + botón para cancelar si aún se puede.
  - `confirmada`: dirección/mapa de la cancha, botón "Agregar a calendario".
  - `rechazada`: motivo del rechazo (texto del `AdminCancha`), botón "Reservar otro horario".
  - `expirada`: explicación de que venció el tiempo de validación, botón "Reservar otro horario".
- **Acciones:** según estado, ver arriba. Cancelar → `ConfirmDialog` → vuelve a `/reservas`.

### 5.7 Mis Reservas (`/reservas`)

- **Propósito:** historial y acceso rápido a reservas activas.
- **Elementos:** tabs "Activas" / "Pasadas", lista de reservas (cada ítem: cancha, fecha/hora, `EstadoReservaBadge`).
- **Estados:** vacío en cada tab (`EmptyState` con CTA "Buscar una cancha" en tab Activas).
- **Acciones:** tap en ítem → `/reservas/[reservaId]`. En "Pasadas", si la reserva fue `confirmada` y no calificada aún, mostrar CTA inline "Calificar" → `/reservas/[reservaId]/calificar`.

### 5.8 Calificar cancha (`/reservas/[reservaId]/calificar`)

- **Propósito:** capturar rating post-partido.
- **Elementos:** `RatingStars` en modo input grande y centrado, campo de comentario opcional, botón "Enviar".
- **Estados:** ya calificada (no debería ser alcanzable dos veces — si se alcanza, mostrar mensaje y redirigir).
- **Acciones:** enviar → toast de confirmación → vuelve a `/reservas`.

### 5.9 Perfil (`/perfil`)

- **Propósito:** datos de cuenta y logout.
- **Elementos:** nombre, teléfono, email, preferencias de notificación (toggle push/email), botón "Cerrar sesión".

---

## 6. Pantallas — AdminCancha

### 6.1 Dashboard resumen (`/admin`)

- **Propósito:** vista rápida al entrar — "¿qué necesita mi atención hoy?".
- **Elementos:** contador destacado de comprobantes pendientes de validar (con link directo a `/admin/validaciones` — esta es la acción más frecuente y debe ser la más visible de la pantalla), `StatCard`s de resumen (reservas hoy, ingresos del mes, ocupación de la semana), lista corta de próximos partidos confirmados.
- **Estados:** loading (skeletons de `StatCard`), sin datos aún (cuenta nueva → `EmptyState` guiando a crear la primera cancha/horarios).
- **Acciones:** ver arriba, más link a `/admin/insights` para el dashboard completo.

### 6.2 Cola de validaciones (`/admin/validaciones`)

- **Propósito:** revisar y decidir sobre comprobantes pendientes — pantalla de mayor frecuencia de uso.
- **Elementos:** lista de `Reserva`s en `pendiente_validacion`, ordenadas por más antigua primero (para minimizar expiraciones), cada ítem muestra: nombre del `Futbolero`, cancha (si administra varias), fecha/hora del slot, monto, tiempo restante antes de expirar (contador visual, ej. "Vence en 12 min" con color de warning si queda poco tiempo). Tap abre vista de detalle/modal con la imagen del `Comprobante` en tamaño completo (zoom habilitado) y dos botones grandes: "Confirmar" (primary/success) y "Rechazar" (danger, abre campo de motivo antes de confirmar el rechazo).
- **Estados:** vacío ("No hay comprobantes pendientes" — estado positivo, no negativo, comunicarlo así), loading.
- **Acciones:** Confirmar/Rechazar → `ConfirmDialog` solo para rechazo (requiere motivo) → toast de resultado → el ítem desaparece de la lista con una transición breve.

### 6.3 Gestión de horarios (`/admin/canchas/[id]/horarios`)

- **Propósito:** crear reglas recurrentes y gestionar `Slot`s individuales.
- **Elementos:** vista de calendario semanal (grid días x horas), botón "Crear regla de horario" abre formulario (días de la semana, hora inicio/fin, duración de bloque, precio, fecha de inicio/fin de la regla). Cada `Slot` en el grid es clickeable para bloquear/desbloquear individualmente o editar su precio puntual.
- **Estados:** slots ya reservados/pendientes se muestran deshabilitados para edición directa (no se puede bloquear un slot con una reserva activa sin antes resolver esa reserva — mostrar mensaje explicativo si se intenta).
- **Acciones:** crear regla → genera `Slot`s hacia adelante (ver Sección 3.2 del doc funcional) → toast de confirmación con cantidad de horarios creados.

### 6.4 Información de cancha (`/admin/canchas/[id]/info`)

- **Propósito:** CRUD de los datos de la `Cancha`.
- **Elementos:** formulario con fotos (uploader múltiple con reordenamiento), nombre, descripción, amenidades (checklist), ubicación (input con autocompletar o pin en mapa), número SINPE, política de cancelación (textarea).
- **Estados:** guardado exitoso (toast), validación de campos requeridos antes de publicar la cancha por primera vez.

### 6.5 Dashboard de insights (`/admin/insights`)

- **Propósito:** métricas de negocio (ver Sección 3.3 del documento funcional para la lista de métricas mínimas).
- **Elementos:** selector de rango de fechas arriba, fila de `StatCard`s (ingresos, ocupación %, tasa de cancelación, rating promedio), heatmap de ocupación por día/hora, gráfico de tendencia de ingresos en el tiempo, tabla o lista de clientes recurrentes.
- **Nota de implementación:** para la construcción visual de gráficos/heatmap en esta pantalla, el agente debe cargar y seguir la guía de la skill `dataviz` disponible en el entorno de Claude Code antes de escribir el código de los charts — cubre paleta de color por serie, especificación de marcas y accesibilidad de gráficos, y no debe reinventarse aquí.
- **Acciones:** botón "Exportar" (CSV/PDF) del rango seleccionado.

### 6.6 Selector de cancha (`/admin/canchas`)

- Solo relevante si el `AdminCancha` administra más de una `Cancha`. Lista simple de canchas con acceso a horarios/info/validaciones de cada una. Si administra solo una, esta pantalla se omite y todo enlaza directo a esa cancha.

### 6.7 Perfil (`/admin/perfil`)

- Igual estructura que 5.9, más datos de negocio si aplica (nombre legal, etc. — mínimo viable, no expandir sin necesidad).

---

## 7. Estados transversales

### 7.1 Loading

- Listas: skeleton con la forma del componente real (no spinner centrado) — reduce percepción de espera.
- Acciones puntuales (botón de submit): spinner inline dentro del botón, deshabilitar el botón durante la operación, nunca permitir doble submit (crítico en creación de `Reserva` y confirmación de pago, por el riesgo de duplicados).

### 7.2 Vacío

- Siempre: ícono/ilustración simple + mensaje en lenguaje humano + acción sugerida cuando aplique. Nunca un mensaje seco tipo "No data".
- Casos: sin canchas en la zona, sin reservas activas, sin comprobantes pendientes (este último es un estado *positivo*, tratarlo visualmente distinto — no gris/triste sino neutro/positivo).

### 7.3 Error

- Error de red: mensaje claro + botón "Reintentar" que preserva el estado del formulario/input (nunca perder una imagen de comprobante ya seleccionada por un error de envío).
- Error de validación de formulario: inline, junto al campo, no solo en un toast genérico.
- Error irrecuperable (ej. recurso no encontrado): pantalla dedicada simple con acción de volver al home del rol correspondiente.

### 7.4 Confirmaciones destructivas

Requieren `ConfirmDialog` explícito: cancelar una `Reserva`, rechazar un `Comprobante`, bloquear/eliminar un `Slot` con reserva activa, eliminar una `Cancha`. Nunca ejecutar estas acciones desde un solo tap sin confirmación.

### 7.5 Offline / conectividad inestable

Dado el contexto de uso (Sección 1.1 del documento funcional), incluir un indicador simple (banner superior) cuando se detecta pérdida de conexión, y bloquear/deshabilitar acciones que requieren red (enviar comprobante, confirmar reserva) mostrando el motivo, en vez de fallar silenciosamente.

---

## 8. Responsive / breakpoints

Usar los breakpoints estándar de Tailwind: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px.

- **< 768px (mobile, default):** layout de una columna, bottom tab bar, formularios full-width, modales full-screen en vez de centrados.
- **768-1024px (tablet):** listas pueden pasar a grid de 2 columnas (ej. `CanchaCard`s), modales centrados con ancho máximo, admin puede empezar a mostrar sidebar en vez de bottom tabs.
- **≥ 1024px (desktop, principalmente para AdminCancha):** sidebar de navegación fija, dashboards con layout de grid multi-columna (ej. `StatCard`s en fila de 4), tablas con más columnas visibles. El flujo de `Futbolero` puede seguir siendo usable en desktop pero no se optimiza layout adicional para eso en MVP — mobile es su caso de uso real.

---

## 9. Accesibilidad

- Contraste mínimo AA (4.5:1 para texto normal, 3:1 para texto grande/íconos) — verificar especialmente los tokens de `warning` y `neutral` sobre fondo blanco.
- Todo input tiene `label` asociado (no solo placeholder).
- Toda imagen (fotos de cancha) tiene `alt` descriptivo; los comprobantes (imagen funcional, no decorativa) tienen `alt="Comprobante de pago SINPE"` o equivalente.
- Navegación por teclado funcional en toda la superficie de `AdminCancha` (uso más probable en desktop).
- Tamaño de texto interactivo nunca menor a 16px en mobile (evita zoom automático de iOS en inputs).

---

## 10. Microinteracciones y feedback

- Transiciones breves (150-200ms) en cambios de estado visual (selección de `Slot`, aparición de badge) — nunca animaciones largas que retrasen la percepción de velocidad.
- Ningún cambio de estado de `Reserva` se muestra de forma optimista antes de confirmación del backend — dado que el pago es manual y las disputas de estado son el riesgo principal del producto (ver 1.2), toda actualización de estado espera respuesta real del servidor antes de reflejarse en UI.
- Notificaciones push/email disparan actualización en tiempo real de la pantalla de estado de reserva si el usuario la tiene abierta (via Supabase Realtime), sin requerir refresh manual.

---

## 11. Guía de implementación para Claude Code

### 11.1 Estructura de carpetas sugerida (Next.js App Router)

```
app/
  (futbolero)/
    buscar/page.tsx
    cancha/[id]/page.tsx
    cancha/[id]/reservar/[slotId]/page.tsx
    cancha/[id]/reservar/[slotId]/comprobante/page.tsx
    reservas/page.tsx
    reservas/[reservaId]/page.tsx
    reservas/[reservaId]/calificar/page.tsx
    perfil/page.tsx
  (admin)/
    admin/page.tsx
    admin/validaciones/page.tsx
    admin/canchas/page.tsx
    admin/canchas/[id]/horarios/page.tsx
    admin/canchas/[id]/info/page.tsx
    admin/insights/page.tsx
    admin/perfil/page.tsx
  login/page.tsx
  registro/page.tsx
components/
  ui/            (componentes base de shadcn/ui, sin modificar salvo necesidad)
  shared/        (EstadoReservaBadge, CanchaCard, SlotPicker, ComprobanteUploader, RatingStars, StatCard, EmptyState, ConfirmDialog)
lib/
  design-tokens.ts (o tailwind.config.ts, ver 11.2)
```

Los grupos de rutas `(futbolero)` y `(admin)` deben protegerse con middleware/guards según el `rol` del `User` autenticado (ver Sección 2, Roles y permisos, del documento funcional) — un `AdminCancha` no debe poder navegar manualmente a rutas de `Futbolero` y viceversa sin al menos una advertencia, y las validaciones de datos (qué `Comprobante`s puede ver, qué `Cancha`s puede editar) se hacen siempre en el backend, nunca solo ocultando la ruta.

### 11.2 Tokens en Tailwind

Los valores de la Sección 2 deben declararse como `theme.extend.colors` en `tailwind.config.ts` con los nombres semánticos (`primary`, `success`, `warning`, `danger`, `neutral`), no como valores hex sueltos repetidos en cada componente. Esto permite ajustar la paleta completa (ej. si se define un branding definitivo más adelante) desde un solo archivo.

### 11.3 Orden de construcción sugerido (alineado con 10.4 del documento funcional — slices verticales)

1. Sistema de diseño base + componentes de 4. (`EstadoReservaBadge`, `CanchaCard`, `SlotPicker`).
2. Flujo Futbolero completo: 5.2 → 5.3 → 5.4 → 5.5 → 5.6 (el camino crítico de punta a punta, antes de tocar el lado admin).
3. Flujo AdminCancha de validación: 6.2 (cola de validaciones) — es la contraparte directa del flujo anterior y permite probar el ciclo completo de una reserva real.
4. Gestión de horarios y de cancha (6.3, 6.4) — necesario para que exista contenido que buscar/reservar, pero puede construirse con datos semilla mientras tanto.
5. Historial, perfil, calificación (5.7, 5.8, 5.9, 6.7) — funcionalidad de soporte, no bloqueante para validar el producto.
6. Dashboard de insights (6.5) — al final, ya que depende de datos históricos acumulados de los pasos anteriores para ser útil de probar.

---

## 12. Checklist de aceptación por pantalla (usar antes de dar una pantalla por terminada)

- [ ] Estado de carga implementado y visualmente distinto del estado con datos.
- [ ] Estado vacío implementado con mensaje humano y acción sugerida (si aplica).
- [ ] Estado de error de red implementado sin pérdida de datos ya ingresados por el usuario.
- [ ] Todo elemento interactivo cumple tamaño táctil mínimo (Sección 2.6).
- [ ] Colores de estado usan los tokens semánticos, no valores sueltos.
- [ ] Probado en viewport mobile (375px) antes que en desktop.
- [ ] Acciones destructivas pasan por `ConfirmDialog`.
- [ ] Ningún estado de `Reserva` se muestra de forma optimista antes de confirmación del backend (Sección 10).
- [ ] Copy revisado contra el tono definido en 1.3 (sin jerga técnica visible al usuario).
