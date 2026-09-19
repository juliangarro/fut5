# Estrategia de monetización e insights para AdminCancha

> Visión de producto, no una spec técnica lista para ejecutar como las
> demás — es el punto de partida para decidir CON el humano a cargo antes
> de construir nada de esto. Referencia: SPEC.md 12.2 ya deja abierta la
> pregunta ("comisión por reserva, suscripción a AdminCancha, o ambos —
> no cambia la arquitectura pero sí el modelo de datos de facturación").
> Esto la responde con una recomendación concreta y por qué.
>
> **Actualizado set 2026** con una segunda palanca de monetización
> (posicionamiento patrocinado + reporte de comentarios) que el cliente
> pidió por separado — ver sección 4.
>
> **Actualizado set 2026 (2)** con el diseño técnico (modelo de datos,
> feature-gating, cron de vencimiento) para la sección 4 — ver sección 6.
>
> **Rumbo aprobado (18 set 2026)** — ver sección 6.0. "Destacado" y
> moderación van como **add-on separado** de los tiers, y la suscripción
> es **por cuenta AdminCancha**, no por cancha. Esto ya es la dirección a
> implementar, no una hipótesis a validar — lo que sigue abierto (precio,
> límites del tier gratis, la lectura de "sin importar filtros") está en
> la sección 7. Nada de esto se migró todavía; la aprobación es de rumbo,
> no un disparador automático de las migraciones de 6.4.

## 0. La restricción que determina todo lo demás

El pago es **SINPE directo entre Futbolero y AdminCancha** (SPEC.md 5) — la
plataforma nunca toca el dinero. Esto descarta, para esta fase, cualquier
modelo de **comisión automática por transacción** (tipo Stripe Connect: la
plataforma retiene un % antes de liquidar al vendedor). No hay liquidación
que interceptar. Una comisión solo sería viable hoy vía facturación manual
mensual al AdminCancha (frágil: depende de que reporte sus reservas reales)
o integrando una pasarela de pago real (Tilopay/ONVOPay), que SPEC.md
sección 4 marca explícitamente fuera del MVP.

**Conclusión:** el modelo de negocio inicial no puede depender de
interceptar el flujo de pago. Tiene que ser algo que la plataforma cobra
*directamente* al AdminCancha, desacoplado del volumen de transacciones que
procesa por fuera.

## 1. Modelo recomendado: suscripción SaaS por AdminCancha

Cuota mensual fija (ej. ₡8,000–15,000/mes por cancha, con descuento por
volumen a partir de 2+ canchas) a cambio de acceso a la plataforma. Encaja
con:

- **Simplicidad de implementación**: no hay que trackear ni facturar por
  reserva individual — un solo estado de suscripción por `usuarios`/cuenta
  admin (activo, vencido, en gracia). Se puede empezar cobrando *fuera* de
  la app (el mismo SINPE, a mano, como ya hace el negocio con sus propios
  clientes) antes de construir ningún flujo de facturación in-app.
- **Alineado con el tamaño real del mercado**: SPEC.md sección 9 ya asume
  ~20 canchas piloto. A esa escala, ingresos por comisión serían
  insignificantes comparado con un SaaS fee predecible.
- **Reduce el riesgo de abandono por fricción de pago**: el AdminCancha ya
  tiene resistencia al flujo manual de comprobantes (SPEC.md 11, riesgo #1
  del producto). Agregar además fricción de pago de la SUSCRIPCIÓN vía
  tarjeta sería apilar dos riesgos de adopción a la vez. Cobrar la
  suscripción igual que ya cobran ellos (SINPE, a mano, mensual) es
  consistente con el contexto real del usuario.

### Estructura de tiers sugerida (ancla, no precio final — ver nota)

| Tier | Precio | Incluye |
|---|---|---|
| Gratis | ₡0 | Todo lo ya construido: reservas, validación manual — **sin límite de canchas ni reservas** (decidido 18 set 2026, sección 7: el tier gratis es la estrategia de adopción, un tope apilaría fricción justo donde el plan dice que no hay que apilarla) |
| Pro | ~₡10,000/mes | + Dashboard de insights (sección 3), 2+ canchas, exportes CSV/PDF |
| Pro+ | ~₡20,000/mes | + Alertas proactivas, comparación con benchmark de plataforma (sección 3) |

> **Actualización set 2026:** el cliente pidió, por separado, una segunda palanca de monetización — posicionamiento patrocinado en resultados de búsqueda — que NO es lo mismo que este tier de insights. Ver sección 4 antes de fijar precios finales; las dos ofertas compiten por el mismo presupuesto del AdminCancha y conviene decidirlas juntas.
>
> **Decidido 18 set 2026 (sección 7):** los montos de esta tabla quedan
> como ancla, no como precio final — se fijan en firme recién después de
> validar con las 3-5 canchas reales del piloto (SPEC.md 12.1). Poner un
> número "final" ahora, sin haber cobrado a nadie todavía, sería adivinar.

El tier gratis no es caridad — es la estrategia de adopción: SPEC.md ya
identifica que el riesgo #1 es que los AdminCancha ni siquiera prueben el
flujo manual. Cobrar desde el día uno multiplica ese riesgo. Dejar el
booking core gratis y monetizar la capa de insights es un patrón PLG
(product-led growth) estándar: primero prueban valor, después pagan por más.

## 2. Por qué insights es la palanca de monetización correcta acá

Los datos que el sistema ya captura (`Reserva`, `Slot`, `Calificacion`) le
dan al AdminCancha algo que hoy gestiona a ojo o en WhatsApp/Excel — visión
real de ocupación e ingresos. Eso es lo que vale pagar, no el booking en sí
(que compite gratis contra "seguir anotando en un cuaderno").

### Métricas ya scopeadas en SPEC.md 3.3 (base del dashboard, sin construir)

- Ocupación por día/semana/mes (heatmap de horarios más demandados)
- Ingresos confirmados por período
- Tasa de cancelación y de no-show
- Rating promedio y su tendencia
- Proporción de clientes recurrentes vs. nuevos

### Insights adicionales que agregaría para el tier pago, en orden de impacto

**Construidos y verificados contra producción (18 set 2026)** — ver
`lib/insightsPro.ts`, sección "Insights Pro" en `/admin/insights`
(gateada por `nivelDeAcceso`), y DECISIONS.md para el detalle de la
verificación:

1. **Horario más rentable / ingreso por slot** — le dice al admin qué
   franjas subir de precio y cuáles bajar para llenar. Es el tipo de
   insight que se paga solo (literalmente le hace ganar plata).
2. **Comparación anonimizada contra el promedio de la plataforma** ("tu
   ocupación está 15% debajo del promedio de canchas similares en tu
   zona/franja horaria"). Es la única métrica que NINGÚN admin puede
   construirse solo en un Excel — necesita datos de otras canchas. Es el
   diferenciador más defendible del tier pago, y el más fácil de vender
   ("esto no lo tenés en ningún otro lado"). Construido **solo para
   ocupación**, no ingresos — `slots` es de lectura pública (RLS ya
   existente, sin migración nueva), pero `reservas.monto` de otros admins
   no lo es; benchmarkear ingresos sí necesitaría una función `security
   definer` nueva. Guardia de anonimato: mínimo 5 canchas ajenas en la
   muestra — con el piloto actual (3 canchas ajenas) da `null`, que es el
   comportamiento correcto, no un bug.
3. **Alertas proactivas** — ej. "3 comprobantes llevan +20 min sin
   validar" (reduce el riesgo de expiración por descuido, que es plata
   perdida real para el admin), "tu ocupación bajó 20% esta semana". Convierte
   el dashboard de algo que hay que ir a mirar a algo que avisa solo —
   mayor percepción de valor por el mismo dato.
4. **Predicción simple de demanda** (media móvil de las últimas semanas,
   sin necesidad de ML real todavía) — "los viernes 18-20h vienen
   creciendo, considerá agregar otro horario".

### Visualización — usar la skill `dataviz` ya referenciada en el doc de UI/UX

El propio `plan-ui-ux-canchas-fut5-cr.md` (sección 6.5) ya instruye cargar
la skill `dataviz` antes de construir los charts — aplica igual acá.
Formas de marca sugeridas por métrica: heatmap (ocupación día×hora), línea
de tendencia (ingresos y rating en el tiempo), barra horizontal (ranking de
horarios por ingreso), `StatCard` numérico con variación ↑/↓ (KPIs
principales arriba del dashboard).

## 3. Secuencia recomendada (no todo a la vez)

1. **Validar retención primero, gratis.** No introducir ningún paywall
   hasta tener 3-5 canchas reales usando el flujo de reservas activamente
   (coincide con SPEC.md 12.1, "validar con 3-5 canchas reales").
2. **Construir el dashboard de insights como está en SPEC.md 3.3**, gratis
   al principio, para medir qué tanto lo usan — es la señal de si vale la
   pena ponerle precio.
3. **Recién ahí, gatear el dashboard completo + las 4 métricas adicionales
   de la sección 2 detrás del tier Pro**, con el booking core siempre
   gratis.
4. **Comisión por transacción queda para una fase posterior**, condicionada
   a integrar una pasarela de pago real — no antes.

## 4. Segunda palanca: funcionalidades premium solicitadas por el cliente (set 2026)

> Origen: audio del cliente (17 set 2026), refinado como requerimientos en
> el doc "Requerimientos v2 — Funcionalidades solicitadas por el cliente".
> Se documentan acá porque ambas piezas son beneficios de un tier pagado y
> deben decidirse junto con la sección 1, no por separado.

### 4.1 Posicionamiento patrocinado ("Destacado")

El AdminCancha con este beneficio activo aparece primero en cualquier
listado de búsqueda, **sin importar filtros** (cercanía, precio, rating),
marcado visiblemente como "Patrocinado". Es un modelo de monetización
distinto al de la sección 1 — se paga por visibilidad, no por acceso a
herramientas de gestión — y **no estaba contemplado en la versión anterior
de este plan**, que dejaba el booking core (incluida la posición en
resultados) gratis a propósito como estrategia de adopción.

Riesgo a acotar antes de construir: un resultado patrocinado que desplaza
canchas más relevantes le resta utilidad a la búsqueda para el Futbolero.
Recomendación: limitar a 1-2 canchas destacadas arriba por búsqueda, el
resto ordenado por relevancia debajo — no vaciar el listado completo de
orden orgánico.

### 4.2 Reporte de comentarios (moderación)

El AdminCancha premium puede **reportar** un comentario de su cancha para
que un moderador humano de la plataforma lo revise — no puede borrarlo
directamente. El filtro automático de lenguaje ofensivo, en cambio, aplica
a todos los AdminCancha por igual y no es parte de ningún tier pagado (es
higiene básica de contenido, no un beneficio premium).

### Bundling y precio (decidido 18 set 2026 — ver sección 6.0 y 7)

Resuelto: **add-on separado** de Pro/Pro+, no empaquetado (sección 6.0).
Ancla de precio: **₡3,000–5,000/mes por cancha destacada** — deliberadamente
bajo respecto a un "producto premium pleno", porque compite por el mismo
presupuesto que Pro y el AdminCancha típico (1-4 canchas) es sensible a
precio. Igual que el precio de Pro/Pro+ (sección 1), se fija en firme
recién después de validar con el piloto, no antes.

**Dependencia que bloquea ambos, sin resolver:** requieren identidad de
usuario confiable (login real — pendiente en Fase 1 del roadmap de
producto). Sin eso, "reportar un comentario" y la reputación que el
ranking patrocinado protege descansan sobre cuentas no verificadas. Nada
de lo decidido el 18 set 2026 (sección 7) cambia esto — sigue siendo la
razón por la que no se construye código de Destacado/moderación todavía.

## 6. Diseño técnico (rumbo aprobado — modelo de datos, gating, rollout)

### 6.0 Registro de decisión

| Decisión | Aprobada | Fecha | Reemplaza |
|---|---|---|---|
| "Destacado" y moderación de reportes son un **add-on separado** de los tiers Pro/Pro+, no van empaquetados dentro | Sí | 2026-09-18 | La pregunta abierta de la sección 4 ("¿dentro de Pro/Pro+ o add-on separado?") |
| La suscripción es **por cuenta AdminCancha**, no por cancha individual — cuadra con "descuento por volumen a partir de 2+ canchas" de la sección 1 | Sí | 2026-09-18 | El vacío de modelo de datos que la sección 5 (v. anterior) dejaba a propósito sin resolver |

Estas dos decisiones ya son la dirección a implementar — el resto de esta
sección (6.1–6.5) es su consecuencia técnica directa, no una alternativa
a evaluar. Lo que sigue sin decidir (precio, límites del tier gratis, la
lectura de "sin importar filtros" en 6.2) está listado en la sección 7 y
sigue bloqueando la implementación de esos puntos puntuales, no el resto
del modelo.

### 6.1 Modelo de datos

Dos tablas nuevas + reuso de `configuracion`.

**`suscripciones`** — un estado por cuenta AdminCancha (no por cancha; un
admin con 3 canchas tiene una sola fila). Sin fila = tier gratis, mismo
patrón de "ausencia = default" que ya usa `lib/featureFlags.ts` para
`cobro_grupal_habilitado`.

```sql
create table suscripciones (
  admin_id uuid primary key references usuarios(id),
  tier text not null check (tier in ('pro', 'pro_plus')),
  estado text not null default 'activa'
    check (estado in ('activa', 'en_gracia', 'vencida')),
  periodo_actual_fin date not null,
  gracia_hasta date,
  notas text,               -- referencia del comprobante SINPE, a mano por ops
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

No hay flujo de pago in-app todavía (sección 1: "se puede empezar
cobrando fuera de la app"), así que **no hay tabla de pagos/facturas en
v1** — solo el estado resultante. Ops actualiza `periodo_actual_fin`/
`estado` a mano en el SQL Editor de Supabase cuando confirma el SINPE
mensual, igual que ya se hace para prender/apagar flags en
`configuracion`. Si más adelante se automatiza el cobro, esta tabla es el
lugar natural para agregar una referencia a una tabla de pagos — no hace
falta rediseñarla ahora.

**`addons_suscripcion`** — tabla separada (add-on, no bundle) porque un
AdminCancha del tier gratis debería poder comprar solo "Destacado" sin
pasar por Pro, y porque `destacado` se activa **por cancha** (una cancha
específica se posiciona, no la cuenta completa) mientras
`moderacion_reportes` se activa **por cuenta**:

```sql
create table addons_suscripcion (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references usuarios(id),
  addon text not null check (addon in ('destacado', 'moderacion_reportes')),
  cancha_id uuid references canchas(id),
  estado text not null default 'activo' check (estado in ('activo', 'vencido')),
  periodo_actual_fin date not null,
  created_at timestamptz not null default now(),
  constraint destacado_requiere_cancha check (
    (addon = 'destacado' and cancha_id is not null) or
    (addon = 'moderacion_reportes' and cancha_id is null)
  )
);

create unique index addons_suscripcion_unico
  on addons_suscripcion (admin_id, addon, coalesce(cancha_id, '00000000-0000-0000-0000-000000000000'));
```

RLS: mismo patrón que `aportes` (00000000000007) — solo SELECT por policy
(`admin_id = auth.uid()`, para que el AdminCancha vea su propio estado en
el dashboard), sin policy de insert/update/delete porque el actor que
escribe es ops vía `createServiceRoleClient()`, no un usuario autenticado.

Config nuevo en `configuracion` (mismo patrón que
`ventana_retencion_minutos` y `cobro_grupal_habilitado`):

- `monetizacion_habilitada` (default `'true'`) — kill switch global:
  apagarlo hace que todo el gating trate a todos como si tuvieran acceso,
  sin deploy, por si el feature-gating tiene un bug.
- `suscripcion_gracia_dias` (default `'7'`) — días de gracia después de
  `periodo_actual_fin` antes de pasar a `vencida`.
- `destacados_max_por_busqueda` (default `'2'`) — tope de canchas
  patrocinadas mostradas arriba, la recomendación de la sección 4.1 ya
  hecha configurable sin deploy.

### 6.2 Feature gating

`lib/suscripciones.ts` (mismo espíritu que `lib/featureFlags.ts`):

```ts
export async function nivelDeAcceso(supabase, adminId): Promise<"gratis" | "pro" | "pro_plus">
export async function tieneDestacado(supabase, canchaId): Promise<boolean>
export async function tieneModeracionReportes(supabase, adminId): Promise<boolean>
```

- `nivelDeAcceso` devuelve el tier si `estado` es `'activa'` **o**
  `'en_gracia'` (el período de gracia mantiene acceso — no castigar al
  admin por lag operativo en confirmar el pago, mismo principio de "no
  apilar fricción" de la sección 1), y `'gratis'` si no hay fila o
  `estado = 'vencida'`.
- Los add-ons no tienen gracia en v1 (montos menores, prioridad más
  baja) — pasan directo de `activo` a `vencido` en `periodo_actual_fin`.
  Es una decisión explícita, no un descuido.
- Todo gating consulta primero `monetizacion_habilitada`; si está en
  `'false'`, devuelve acceso total sin tocar las tablas nuevas.

Puntos de gating identificados en el código actual:

- Dashboard de insights (secciones 2–3, todavía no construido) →
  `nivelDeAcceso`.
- [ListaCanchas.tsx:49-56](app/futbolero/canchas/ListaCanchas.tsx:49) — el
  `sort` de `filtradas` necesita anteponer hasta
  `destacados_max_por_busqueda` canchas con `tieneDestacado`, ignorando
  el `orden` elegido (precio/rating), pero sin ignorar
  `busqueda`/`amenidadesActivas`. Lectura propuesta del "sin importar
  filtros" de la sección 4.1: se refiere a los criterios de *orden*
  (cercanía/precio/rating), no a la *búsqueda por texto* — mostrar una
  cancha patrocinada que no matchea lo que el Futbolero escribió sería
  peor UX, no mejor venta. **Confirmar esta lectura con Pamela antes de
  construir** — es una interpretación, no algo que el requerimiento
  original diga literalmente.
- Botón de "reportar comentario" (sección 4.2, todavía no construido) →
  `tieneModeracionReportes`. El filtro automático de lenguaje ofensivo NO
  pasa por este check — aplica siempre, sin importar tier (así lo pide
  explícitamente la sección 4.2).

### 6.3 Ciclo de vida y vencimiento

Mismo patrón que `expirar-reservas`: una función RPC + un cron endpoint.

```sql
create function vencer_suscripciones_y_addons()
returns void language plpgsql security definer set search_path = public as $$
begin
  update suscripciones set estado = 'en_gracia',
    gracia_hasta = current_date + (select valor::int from configuracion where clave = 'suscripcion_gracia_dias')
  where estado = 'activa' and periodo_actual_fin < current_date;

  update suscripciones set estado = 'vencida'
  where estado = 'en_gracia' and gracia_hasta < current_date;

  update addons_suscripcion set estado = 'vencido'
  where estado = 'activo' and periodo_actual_fin < current_date;
end;
$$;
```

`app/api/cron/vencer-suscripciones/route.ts` — copia del patrón de
[expirar-reservas/route.ts](app/api/cron/expirar-reservas/route.ts:8)
(mismo chequeo de `CRON_SECRET`, mismo `createServiceRoleClient()`),
agregado al mismo `vercel.json`, corrida diaria.

Reactivar (pago confirmado) sigue siendo manual en v1: ops hace
`UPDATE suscripciones SET estado='activa', periodo_actual_fin=... WHERE
admin_id=...` a mano. No se construye UI de ops para esto todavía —
mismo criterio que ya aplica la sección 1 ("empezar cobrando fuera de la
app... antes de construir ningún flujo de facturación in-app").

**Gatillo para automatizarlo (decidido 18 set 2026, sección 7):** no
"cuando duela" — un umbral concreto, para que no se vuelva deuda técnica
invisible que nadie prioriza hasta que ya es un problema. Cualquiera de
estos dos, el que llegue primero: **más de 15-20 cuentas pagando
activas**, o **ops reporta que le toma más de X minutos/semana**
(número de X a definir cuando se llegue a ese punto — no hay dato hoy
para fijarlo).

### 6.4 Migraciones (creadas — 2026-09-18)

1. [00000000000009_suscripciones.sql](supabase/migrations/00000000000009_suscripciones.sql)
   — tabla `suscripciones`, RLS, flags `monetizacion_habilitada` y
   `suscripcion_gracia_dias` en `configuracion`. Sin `updated_at`: el repo
   no tiene precedente de esa columna genérica en ninguna tabla (usa
   timestamps específicos por evento, como `resuelta_at`), así que se
   simplificó respecto al borrador original de esta sección.
2. [00000000000010_addons_suscripcion.sql](supabase/migrations/00000000000010_addons_suscripcion.sql)
   — tabla `addons_suscripcion`, RLS, flag `destacados_max_por_busqueda`.
   Ajuste sobre el borrador: se agregó una policy de SELECT público para
   `destacado` activo (`addons_suscripcion_select_publico_destacado`) —
   sin ella, el listado de búsqueda del Futbolero no podría leer qué
   canchas están destacadas, porque la policy original solo dejaba ver al
   propio admin. `estado='activo'` en una fila de "posicionamiento
   patrocinado" ya es información pública por diseño (se muestra como
   "Patrocinado" en la UI), así que no es una relajación de RLS riesgosa.
3. [00000000000011_vencer_suscripciones.sql](supabase/migrations/00000000000011_vencer_suscripciones.sql)
   — función `vencer_suscripciones_y_addons`.

Rollback combinado (borra todo, no un apagado temporal — para eso está el
flag): [00000000000009_monetizacion_admin_DOWN.sql](supabase/rollback/00000000000009_monetizacion_admin_DOWN.sql).

También creados en esta pasada: [lib/suscripciones.ts](lib/suscripciones.ts)
(`nivelDeAcceso`, `tieneDestacado`, `tieneModeracionReportes`), tipos en
[lib/types/database.ts](lib/types/database.ts), y el cron
[app/api/cron/vencer-suscripciones/route.ts](app/api/cron/vencer-suscripciones/route.ts)
+ entrada en [vercel.json](vercel.json).

**Precisión sobre el kill switch `monetizacion_habilitada`** (afinada
durante la implementación, no estaba en el borrador): solo aplica
fail-open a `nivelDeAcceso` (nadie queda bloqueado de Pro por un bug de
gating). `tieneDestacado`/`tieneModeracionReportes` NO lo consultan — son
beneficios aditivos, no bloqueos; un bug ahí como mucho oculta una
promoción ya pagada, no le niega el producto a nadie. Tratarlos igual que
`nivelDeAcceso` hubiera significado que apagar el flag marca a *todas*
las canchas como destacadas, que no tiene sentido.

**Deliberadamente NO se tocó en esta pasada**: el `sort` de
[ListaCanchas.tsx:49-56](app/futbolero/canchas/ListaCanchas.tsx:49) sigue
sin usar `tieneDestacado` — la interpretación de "sin importar filtros"
que propone 6.2 sigue sin confirmar con Pamela (ver sección 7), y el
dashboard de insights y el botón de reportar comentario (4.2) todavía no
existen en el código para gatear. Lo que se construyó acá es la
infraestructura (esquema + helpers + vencimiento), no los puntos de
gating en UI — esos se conectan cuando se construya cada feature
consumidora, mismo criterio que ya usa el repo para `aportes`.

### 6.5 Trade-offs explícitos

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Suscripción por `admin_id`, no por cancha | Una fila de suscripción por cancha | La sección 1 ya vende "descuento por volumen a partir de 2+ canchas" — solo tiene sentido si la unidad de facturación es la cuenta, no la cancha individual |
| Add-on en tabla separada | Meter `destacado`/`moderacion_reportes` como columnas booleanas en `suscripciones` | Un AdminCancha gratis puede comprar solo "Destacado" sin pagar Pro — bundlearlo en `suscripciones` obligaría a inventar un tier falso solo para eso |
| Sin tabla de pagos/facturas en v1 | Ledger de transacciones desde el día uno | No hay flujo de cobro in-app todavía (SINPE manual, sección 1) — una tabla de pagos sin nada que la escriba automáticamente es complejidad sin beneficio hoy |
| Gracia solo para `suscripciones`, no para add-ons | Gracia también para add-ons | Add-ons son montos menores y opcionales — vencer sin gracia es aceptable; una segunda variable de config no tiene beneficio claro todavía |

## 7. Decisiones (18 set 2026) y lo que sigue abierto

Resueltas hoy, con contexto completo de SPEC.md/DECISIONS.md/este plan y
el pivote real a "Dale Cancha":

1. **Precio Pro/Pro+ y add-ons** — se mantiene el rango de la sección 1
   (~₡10,000 Pro / ~₡20,000 Pro+) como ancla, pero se fija en firme recién
   después de validar con las 3-5 canchas reales del piloto (SPEC.md
   12.1); poner un número "final" ahora sería adivinar. Para "Destacado" y
   moderación (add-on separado, ya aprobado en 6.0), ancla de
   **₡3,000-5,000/mes por cancha destacada** — deliberadamente bajo
   frente a un producto premium pleno, porque compite por el mismo
   presupuesto que Pro y el AdminCancha típico (1-4 canchas) es sensible
   a precio. Aplicado en la sección 1 y en 4.2.
2. **Límite del tier gratis** — **ilimitado**, sin topes de canchas ni
   reservas. El tier gratis es la estrategia de adopción (PLG) y el
   riesgo #1 del producto es que ni siquiera prueben el flujo; un tope
   apilaría fricción justo donde el plan dice que no hay que apilarla, y
   el mecanismo de monetización ya elegido (insights + add-ons, no
   comisión ni límite de uso) no necesita un cap para funcionar.
   Aplicado en la tabla de la sección 1.
4. **Automatizar reactivación de pago** — de acuerdo en no bloquear nada
   ahora (SQL a mano por ops es proporcional al volumen actual, piloto
   ~20 canchas), pero con un gatillo concreto en vez de "cuando duela":
   más de 15-20 cuentas pagando activas, o el momento en que ops reporte
   que le toma más de X minutos/semana — así no se vuelve deuda técnica
   invisible. Aplicado en 6.3.

Sin resolver todavía:

3. **La interpretación de "sin importar filtros" para "Destacado"**
   propuesta en 6.2 (bypassea orden, no búsqueda) — confirmar con Pamela
   antes de tocar `ListaCanchas.tsx`.
5. **La dependencia de login real** (Fase 1 del roadmap de producto,
   sección 4) — sigue bloqueando "Destacado" y moderación de reportes por
   completo, sin importar lo que se decida en 1-4; nada de lo resuelto
   hoy la levanta. Es la que manda: mientras siga abierta, no tiene
   sentido construir código de Destacado/moderación, aunque 1 y 3 ya
   tengan respuesta.
