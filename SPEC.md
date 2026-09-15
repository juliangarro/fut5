# Especificación de Producto y Arquitectura — App de Reservas para Canchas de Fútbol 5 (Costa Rica)

> **Audiencia de este documento: agentes de IA (coding agents) que van a implementar o continuar este proyecto.** El lenguaje prioriza precisión y ausencia de ambigüedad sobre prosa. Cuando una sección define un comportamiento, ese comportamiento es la fuente de verdad — si el código diverge de este documento, el documento gana a menos que el humano a cargo indique lo contrario explícitamente.

---

## 0. Cómo usar este documento

- Este documento describe QUÉ se debe construir y CON QUÉ RESTRICCIONES. No es una implementación paso a paso — los agentes tienen libertad de diseño dentro de los límites aquí definidos.
- La Sección 10 ("Principios y buenas prácticas") aplica a **todo** el código que se escriba en este proyecto, sin excepción, independientemente de qué feature se esté implementando.
- Cuando una decisión de este documento parezca ambigua o insuficiente para implementar, el agente debe preferir la opción más simple, más segura y más fácil de revertir, y dejar constancia de la decisión tomada (ver 10.7, Decision Records).
- Términos en **mayúscula-concepto** (ej. `Reserva`, `Slot`, `Comprobante`) son entidades formales definidas en la Sección 7 (Modelo de datos). Úsalos consistentemente en código, nombres de tablas, variables y commits.

---

## 1. Contexto del producto

Plataforma de reservas para canchas de fútbol 5 en Costa Rica. Conecta dos tipos de usuario:

- `Futbolero`: persona que busca y reserva un horario en una cancha.
- `AdminCancha`: operador/dueño de una o más canchas que gestiona horarios, precios y valida pagos.

**Decisión de plataforma (cerrada, no evaluar alternativas):** PWA (Progressive Web App) sobre Next.js, no apps nativas separadas, para MVP. Un solo código base sirve ambos roles.

**Decisión de stack técnico (cerrada, no evaluar alternativas):** **Vercel** para hosting/deploy del frontend y **Supabase** como backend completo (Postgres, Auth, Storage, Realtime). Ningún agente debe proponer, evaluar o migrar a otro proveedor de hosting, base de datos, auth o storage sin instrucción explícita del humano a cargo. Ver Sección 6 para el detalle de cómo se usa cada servicio.

**Decisión de negocio no negociable:** el pago se procesa vía **SINPE Móvil** (método de transferencia bancaria instantánea dominante en Costa Rica). No existe integración automática de conciliación bancaria disponible para esta fase del proyecto. Esta restricción no es un gap técnico a resolver — es una decisión de producto explícita. Ver Sección 5.

---

## 2. Roles y permisos (resumen)

| Capacidad | Futbolero | AdminCancha |
|---|---|---|
| Ver canchas, ratings, horarios | ✅ | ✅ (solo las propias, en su dashboard) |
| Reservar un `Slot` | ✅ | ❌ |
| Subir `Comprobante` de pago | ✅ (solo para sus propias reservas) | ❌ |
| Ver `Comprobante` de una reserva | ❌ (solo el admin de esa cancha) | ✅ (solo de sus propias canchas) |
| Confirmar/rechazar una reserva | ❌ | ✅ (solo de sus propias canchas) |
| Crear/editar `Slot`s y precios | ❌ | ✅ (solo de sus propias canchas) |
| Calificar una cancha | ✅ (solo tras una reserva `confirmada` y jugada) | ❌ |
| Ver dashboard de insights | ❌ | ✅ (solo de sus propias canchas) |

Regla de autorización general: todo acceso de escritura y todo acceso a un `Comprobante` debe validarse a nivel de backend contra la propiedad del recurso (un `AdminCancha` nunca puede ver comprobantes de canchas que no le pertenecen; un `Futbolero` nunca puede ver comprobantes de otros usuarios). Esto se implementa con Row Level Security (RLS) si se usa Supabase/Postgres — no confiar solo en lógica de frontend.

---

## 3. Requisitos funcionales

### 3.1 Futbolero

1. Registro/login (email/password + OAuth social opcional).
2. Buscar canchas por ubicación (geolocalización o filtro por provincia/cantón).
3. Ver perfil de cancha: fotos, rating promedio, precio por horario, amenidades, reglas, política de cancelación.
4. Ver calendario de disponibilidad por `Slot` (bloques de horario, con estado: disponible / reservado / bloqueado).
5. Reservar un `Slot` disponible → esto crea una `Reserva` en estado `pendiente_pago` (ver 5.2, máquina de estados).
6. Subir un `Comprobante` (imagen) de transferencia SINPE asociado a la `Reserva`.
7. Ver el estado de sus reservas en tiempo real (`pendiente_validacion`, `confirmada`, `rechazada`, `expirada`, `cancelada`).
8. Historial de reservas pasadas y recibos.
9. Calificar una cancha (1-5 estrellas + comentario opcional) solo si tiene al menos una `Reserva` en estado `confirmada` con fecha de juego ya pasada.
10. Recibir notificaciones (push/email) en cada cambio de estado de una `Reserva`.
11. Cancelar una `Reserva` propia según la política de cancelación de la cancha (definida por el `AdminCancha`).

### 3.2 AdminCancha

1. Registro de negocio. Una cuenta `AdminCancha` puede administrar una o más `Cancha`s (relación 1-a-muchos).
2. Crear reglas de horario recurrentes (ej. "lunes a viernes, 18:00-22:00, bloques de 1h") que generan `Slot`s hacia adelante automáticamente (ventana configurable, default 4 semanas).
3. Editar o bloquear `Slot`s individuales (mantenimiento, reservas externas no digitales).
4. Definir precio por `Slot` o por franja horaria (soporta tarifas diferenciadas pico/valle).
5. Ver cola de `Reserva`s en estado `pendiente_validacion` con su `Comprobante` adjunto.
6. Confirmar o rechazar una `Reserva` (rechazo requiere motivo en texto libre, se lo notifica al `Futbolero`).
7. Editar información de la `Cancha` (fotos, amenidades, ubicación, reglas, política de cancelación, número SINPE de recepción de pagos).
8. Dashboard de insights (ver 3.3).
9. Exportar reportes (CSV/PDF) de reservas e ingresos por rango de fechas.

### 3.3 Dashboard de insights (AdminCancha) — métricas mínimas

- Ocupación por día/semana/mes (heatmap de horarios más demandados).
- Ingresos confirmados por período (solo `Reserva`s en estado `confirmada`).
- Tasa de cancelación y de no-show.
- Rating promedio y su tendencia en el tiempo.
- Proporción de clientes recurrentes vs. nuevos.

---

## 4. No-objetivos explícitos del MVP

Para evitar que un agente expanda scope sin que se le pida, lo siguiente está **fuera de alcance** del MVP salvo instrucción explícita en contrario:

- Conciliación automática de pagos SINPE (OCR, integración bancaria).
- Notificaciones por WhatsApp.
- App nativa (React Native / Swift / Kotlin).
- Sistema de "armar equipo" / matchmaking de jugadores.
- Pasarela de pago con tarjeta (Tilopay, ONVOPay, etc.).
- Multi-idioma.
- Roles de sub-administrador con permisos granulares.

---

## 5. Flujo de pago SINPE — manual por diseño

**Esto no es un placeholder ni un TODO.** El MVP asume, como decisión de producto, que no hay forma de verificar automáticamente una transferencia SINPE Móvil contra el sistema. El flujo completo es:

### 5.1 Flujo end-to-end

1. El `Futbolero` selecciona un `Slot` disponible.
2. El sistema muestra el monto exacto a pagar y el número SINPE de la `Cancha` (dato configurado por el `AdminCancha`).
3. El `Futbolero` realiza la transferencia desde su app bancaria (fuera del sistema — no hay integración).
4. El `Futbolero` sube una foto/captura del comprobante de la transferencia como `Comprobante` (imagen), asociada a la `Reserva`.
5. El `Slot` queda retenido (nadie más puede reservarlo) mientras la `Reserva` está en `pendiente_validacion`.
6. El `AdminCancha` recibe notificación, abre el `Comprobante`, y decide manualmente: confirmar o rechazar.
7. Si confirma → `Reserva.estado = confirmada`, se notifica al `Futbolero`.
8. Si rechaza → `Reserva.estado = rechazada` con motivo, se libera el `Slot`, se notifica al `Futbolero`.
9. Si no hay decisión del admin dentro de la ventana de retención (configurable, default 30 minutos desde la subida del comprobante) → el sistema expira la `Reserva` automáticamente (`estado = expirada`) y libera el `Slot`.

### 5.2 Máquina de estados de `Reserva`

```
creada (slot elegido, sin comprobante)
   → pendiente_validacion (comprobante subido)
        → confirmada (admin aprueba)
        → rechazada (admin rechaza, con motivo)
        → expirada (timeout sin decisión del admin)
   → cancelada (futbolero cancela antes de subir comprobante, o cancelada según política tras confirmación)
```

Reglas duras:
- Un `Slot` solo puede tener una `Reserva` activa a la vez (`creada`, `pendiente_validacion` o `confirmada`). Esto debe garantizarse con una restricción a nivel de base de datos (constraint único o transacción con lock), no solo validación de aplicación — es la forma de prevenir doble reserva bajo concurrencia.
- El `Comprobante` (archivo de imagen) es visible únicamente para el `Futbolero` que lo subió y el `AdminCancha` de esa `Cancha`. Nunca público, nunca indexado, nunca accesible por URL directa sin autenticación.

### 5.3 Fuera de alcance (recordatorio)

No implementar: OCR sobre el comprobante, validación automática de monto/referencia, ni integración con ningún banco o SINPE Comercial. Si en el futuro se decide automatizar esto, es un proyecto aparte que reemplaza (no extiende) el flujo aquí descrito.

---

## 6. Arquitectura técnica

### 6.1 Stack (definitivo — no sujeto a re-evaluación por los agentes)

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | Next.js (React) + Tailwind CSS, configurado como PWA | Un solo código base para ambos roles, diferenciado por rutas protegidas según rol |
| Backend | API routes de Next.js sobre Supabase (Postgres + Auth + Storage + Realtime) | No usar NestJS, Express ni ningún backend separado — la lógica de negocio vive en API routes de Next.js y en funciones/triggers de Postgres cuando aplique |
| Base de datos | PostgreSQL vía Supabase | Relacional — la integridad transaccional es crítica para el flujo de reservas |
| Storage de archivos | Supabase Storage | Fotos de cancha (públicas) y `Comprobante`s (privados, con políticas RLS) en buckets separados |
| Autenticación | Supabase Auth | Incluye OAuth social |
| Notificaciones | OneSignal (push) + Resend (email transaccional) | WhatsApp queda fuera de MVP (ver Sección 4); no son parte del stack "core" y sí pueden reevaluarse si aparece una mejor opción |
| Hosting frontend | Vercel | |
| Hosting backend/DB | Supabase | |

Cualquier necesidad que parezca requerir un servicio fuera de esta tabla (ej. una cola de mensajes, un servicio de cómputo aparte) debe resolverse primero dentro de las capacidades de Supabase/Vercel (Edge Functions, cron jobs de Supabase, Vercel Cron) antes de proponer infraestructura adicional — ver también 10.3 (Simplicidad y alcance).

### 6.2 Principio de arquitectura: separar la retención del `Slot` de la confirmación del pago

El sistema debe tratar "reservar" y "pagar" como dos eventos distintos con sus propios timestamps y estados, nunca colapsarlos en un solo booleano `pagado: true/false`. Esto es necesario porque el estado intermedio (`pendiente_validacion`) es central al producto, no un detalle de implementación.

---

## 7. Modelo de datos

Entidades principales y sus campos mínimos. Tipos son orientativos (Postgres); un agente puede ajustar tipos exactos pero debe preservar las relaciones y restricciones descritas.

```
User
  id uuid PK
  rol enum(futbolero, admin_cancha)
  nombre text
  telefono text
  email text unique
  auth_provider text
  created_at timestamptz

Cancha
  id uuid PK
  admin_id uuid FK -> User.id
  nombre text
  ubicacion geography/point
  descripcion text
  amenidades jsonb
  fotos text[] (URLs a Supabase Storage, bucket público)
  numero_sinpe text
  politica_cancelacion text
  rating_promedio numeric (derivado, recalculado por trigger o job)
  created_at timestamptz

Slot
  id uuid PK
  cancha_id uuid FK -> Cancha.id
  fecha date
  hora_inicio time
  hora_fin time
  precio numeric
  estado enum(disponible, retenido, reservado, bloqueado)
  regla_recurrente_id uuid nullable (referencia a la regla que lo generó)
  UNIQUE constraint sobre (cancha_id, fecha, hora_inicio) para evitar slots duplicados

Reserva
  id uuid PK
  futbolero_id uuid FK -> User.id
  slot_id uuid FK -> Slot.id, UNIQUE mientras estado in (creada, pendiente_validacion, confirmada)
  estado enum(creada, pendiente_validacion, confirmada, rechazada, expirada, cancelada)
  comprobante_url text nullable (bucket privado)
  monto numeric
  motivo_rechazo text nullable
  creada_at timestamptz
  comprobante_subido_at timestamptz nullable
  expira_at timestamptz nullable (calculado al subir comprobante)
  resuelta_at timestamptz nullable

Rating
  id uuid PK
  cancha_id uuid FK -> Cancha.id
  futbolero_id uuid FK -> User.id
  reserva_id uuid FK -> Reserva.id, UNIQUE (un rating por reserva)
  puntaje int (1-5)
  comentario text nullable
  created_at timestamptz

Notificacion
  id uuid PK
  user_id uuid FK -> User.id
  tipo text
  canal enum(push, email)
  estado_envio enum(pendiente, enviada, fallida)
  created_at timestamptz
```

---

## 8. Estimación de tiempo (MVP)

Supuesto: 1 desarrollador full-stack senior + 1 diseñador UI/UX part-time. Columna alterna con 2 desarrolladores full-time.

| Fase | 1 dev | 2 devs |
|---|---|---|
| Descubrimiento y diseño (wireframes, UI kit, flujos) | 2 sem | 1.5 sem |
| Setup técnico (infra, auth, CI/CD) | 1 sem | 0.5 sem |
| Backend core (modelos, API canchas/horarios/reservas) | 3 sem | 2 sem |
| Frontend Futbolero (búsqueda, calendario, reserva, comprobante, rating) | 4 sem | 2.5 sem |
| Frontend AdminCancha (horarios, validación de pagos, CRUD cancha) | 3 sem | 2 sem |
| Dashboard de insights | 2 sem | 1.5 sem |
| Notificaciones (push, email, recordatorios) | 1 sem | 1 sem |
| QA, pulido, piloto con canchas reales | 2 sem | 1.5 sem |
| **Total** | **≈18 sem (4.5 meses)** | **≈12.5 sem (3 meses)** |

Agregar 15-20% de buffer sobre el total. Si se usa React Native nativo en lugar de PWA desde el inicio, sumar 3-4 semanas por builds nativos y publicación en tiendas.

---

## 9. Costos de infraestructura (a 20 clientes/canchas activos)

Supuestos de tráfico: ~20 canchas × 15 reservas/semana ≈ 1,300 reservas/mes; ~1,000-2,000 `Futbolero`s activos/mes; ~650MB/mes de crecimiento de storage por comprobantes; ~600MB una sola vez por fotos de cancha. A este volumen, tanto Vercel como Supabase se mantienen dentro de sus planes Pro sin excedentes significativos.

| Servicio | Plan | Costo | Cubre a este volumen |
|---|---|---|---|
| Vercel | Pro | $20/mes | Incluye $20 de crédito de uso — sin excedente esperado |
| Supabase | Pro | $25/mes | DB 8GB, storage 100GB, egress 250GB, 100K MAU incluidos — con margen amplio |
| Dominio | — | ~$1-1.5/mes | |
| Email transaccional (Resend) | Free | $0 | Hasta 3,000 emails/mes |
| Push (OneSignal) | Free | $0 | Hasta 10,000 suscriptores |
| Monitoreo (Sentry) | Free | $0 | Suficiente en esta etapa |
| **Total base** | | **≈ $46-47/mes** | ≈ ₡20,700-21,000/mes (tipo de cambio ~₡450/USD) |

Si se agregan recordatorios por SMS/WhatsApp vía Twilio (fuera de MVP, ver Sección 4), sumar ~$20-60/mes adicionales según volumen.

Motivo del salto de plan (referencia): pasar de Supabase Pro a Team ($599/mes) es por compliance (SOC2, SSO), no por volumen — a 20-200 clientes normalmente se permanece en Pro pagando solo excedente si aparece ($0.125/GB DB extra, $0.0213/GB storage extra, $0.09/GB egress extra, $2 por millón de invocaciones extra).

Recomendación operativa: definir política de retención de `Comprobante`s (ej. archivar o borrar los de reservas con más de 12 meses) para no acumular storage indefinidamente.

---

## 10. Principios y buenas prácticas para los agentes que trabajen en este proyecto

Estos principios son transversales — aplican a cualquier feature, cualquier fase, cualquier agente que toque este código.

### 10.1 Seguridad y datos sensibles

- Los `Comprobante`s contienen información bancaria parcial de usuarios reales. Tratarlos como PII/datos financieros sensibles: bucket privado, URLs firmadas con expiración corta, nunca loggear su contenido, nunca exponerlos en respuestas de API a quien no sea el dueño de la reserva o el admin correspondiente.
- Toda autorización se valida en el backend (o vía RLS en Postgres), nunca solo en el cliente. El frontend puede ocultar un botón; eso no reemplaza la validación de permisos en la API.
- Nunca commitear secretos (API keys, connection strings) al repositorio. Usar variables de entorno y un `.env.example` sin valores reales.
- Validar y sanear todo input de usuario, especialmente el upload de imágenes (tipo de archivo, tamaño máximo, escaneo básico antes de aceptar el archivo).

### 10.2 Integridad transaccional

- Cualquier operación que cambie el estado de un `Slot` o una `Reserva` debe ser atómica (transacción de base de datos). La condición de carrera más peligrosa del sistema es que dos `Futbolero`s reserven el mismo `Slot` simultáneamente — debe prevenirse con constraints de base de datos, no solo con lógica de aplicación.
- Las transiciones de estado de `Reserva` (Sección 5.2) son la única fuente de verdad. No introducir estados nuevos sin actualizar este documento.

### 10.3 Simplicidad y alcance

- No implementar nada listado en la Sección 4 (No-objetivos) sin instrucción explícita del humano a cargo.
- Preferir la solución más simple que cumpla el requisito. No introducir microservicios, colas de mensajes, o infraestructura adicional a menos que el volumen real lo justifique — este proyecto empieza con 20 clientes, no con escala de miles.
- Evitar abstracciones prematuras (capas de indirección, patrones de diseño complejos) para requisitos que hoy son simples.

### 10.4 Trabajo incremental y verificable

- Construir en slices verticales (una feature completa de punta a punta: DB → API → UI) en lugar de terminar todas las capas de todas las features a la vez. Esto permite validar con el usuario/negocio antes de seguir.
- Cada cambio debe ser verificable: tests automatizados cuando aplique, y como mínimo un paso manual de verificación descrito en el PR o commit (qué se probó, cómo).
- No marcar una tarea como completa si no se verificó que funciona — correr el código, no solo leerlo.

### 10.5 Calidad de código

- Nombres de variables, funciones y tablas en el mismo idioma consistentemente (este documento usa español para conceptos de dominio — `Reserva`, `Slot`, `Comprobante` — se recomienda mantener esa consistencia en el modelo de datos y API para que el dominio sea legible; el código de infraestructura/genérico puede estar en inglés).
- Un componente/función hace una cosa. Si una función de API mezcla validación, lógica de negocio y efectos secundarios sin separación, refactorizar antes de agregar más funcionalidad encima.
- Manejo de errores explícito: nunca silenciar un error de subida de comprobante, de creación de reserva o de notificación. El usuario debe saber si algo falló.
- Logging estructurado (no `console.log` suelto) para eventos de negocio clave: creación de reserva, cambio de estado, fallo de notificación.

### 10.6 Git y control de versiones

- Commits atómicos con mensajes descriptivos (qué cambia y por qué, no solo "fix").
- Ramas por feature, nunca trabajar directo sobre la rama principal.
- No mezclar refactors grandes con features nuevas en el mismo commit/PR — dificulta revisar y revertir.

### 10.7 Decisiones y documentación

- Cuando un agente tome una decisión de diseño no cubierta explícitamente por este documento (ej. exacta estructura de una respuesta de API, nombre de una tabla auxiliar), debe dejar un registro breve (comentario en el código o entrada en un archivo `DECISIONS.md`) explicando la decisión y su razón. Esto evita que el siguiente agente tenga que re-descubrir el contexto.
- Mantener este documento actualizado si una decisión de producto cambia (ej. se decide automatizar la validación de pagos) — el documento debe reflejar la realidad del sistema, no quedar desactualizado.

### 10.8 Rendimiento y costos

- Este proyecto corre en Vercel + Supabase con presupuesto ajustado (Sección 9). Evitar queries N+1, evitar recalcular agregados costosos (ej. rating promedio) en cada lectura — usar triggers o jobs para mantenerlos actualizados.
- Comprimir/redimensionar imágenes (fotos de cancha, comprobantes) antes de subirlas a storage — no subir archivos sin procesar directamente desde el cliente.

### 10.9 Accesibilidad y usabilidad básica

- La app debe ser usable en conexiones lentas/inestables (reintento automático en subida de comprobante, indicadores de carga claros) — es un contexto de uso real esperado en Costa Rica fuera de zonas urbanas.
- Contraste y tamaño de texto legibles en móvil, dado que la mayoría de `Futbolero`s usarán la app desde el celular.

---

## 11. Riesgos (resumen)

- Adopción del flujo de validación manual por parte de `AdminCancha`s acostumbrados a WhatsApp/Excel — riesgo de producto, no técnico.
- Conectividad inestable durante la subida de comprobantes.
- Disputas de "pagué y no me confirmaron" si el estado intermedio no es claro para el `Futbolero` — mitigado por la máquina de estados explícita (Sección 5.2) y notificaciones en cada transición.

---

## 12. Próximos pasos sugeridos

1. Validar con 3-5 canchas reales si el flujo manual de comprobantes es aceptable.
2. Definir modelo de monetización (comisión por reserva, suscripción a `AdminCancha`, o ambos) — no cambia la arquitectura pero sí el modelo de datos de facturación, no cubierto en este documento.
3. Confirmar la ventana de retención del `Slot` (default propuesto: 30 min) con el negocio.
4. Empezar por el flujo de reserva + validación de pago (Secciones 3 y 5) como primer slice vertical, ya que es el corazón del producto.
