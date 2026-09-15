# Estrategia de monetización e insights para AdminCancha

> Visión de producto, no una spec técnica lista para ejecutar como las
> demás — es el punto de partida para decidir CON el humano a cargo antes
> de construir nada de esto. Referencia: SPEC.md 12.2 ya deja abierta la
> pregunta ("comisión por reserva, suscripción a AdminCancha, o ambos —
> no cambia la arquitectura pero sí el modelo de datos de facturación").
> Esto la responde con una recomendación concreta y por qué.

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

### Estructura de tiers sugerida (no vinculante, para discutir)

| Tier | Precio | Incluye |
|---|---|---|
| Gratis | ₡0 | Todo lo ya construido: reservas, validación manual, 1 cancha |
| Pro | ~₡10,000/mes | + Dashboard de insights (sección 3), 2+ canchas, exportes CSV/PDF |
| Pro+ | ~₡20,000/mes | + Alertas proactivas, comparación con benchmark de plataforma (sección 3) |

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

1. **Horario más rentable / ingreso por slot** — le dice al admin qué
   franjas subir de precio y cuáles bajar para llenar. Es el tipo de
   insight que se paga solo (literalmente le hace ganar plata).
2. **Comparación anonimizada contra el promedio de la plataforma** ("tu
   ocupación está 15% debajo del promedio de canchas similares en tu
   zona/franja horaria"). Es la única métrica que NINGÚN admin puede
   construirse solo en un Excel — necesita datos de otras canchas. Es el
   diferenciador más defendible del tier pago, y el más fácil de vender
   ("esto no lo tenés en ningún otro lado").
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

## 4. Lo que esto NO resuelve todavía (a decidir con el humano a cargo)

- Modelo de datos de facturación/suscripción (qué tabla, cómo se marca
  vencida una cuenta, período de gracia) — no está en SPEC.md ni se
  diseñó acá a propósito, es la primera decisión a tomar si se aprueba
  este rumbo.
- Precio exacto — los montos de la tabla de la sección 1 son un punto de
  partida para discutir, no una investigación de mercado.
- Si el tier gratis tiene límite de canchas/reservas por mes, o es
  ilimitado hasta que se decida meter el paywall.
