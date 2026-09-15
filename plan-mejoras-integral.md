# Plan de mejoras integral — 5 perspectivas

> Construido usando la app real (ambos roles, flujo completo) + revisión de
> código de todo lo construido en esta sesión. No duplica
> [roadmap-producto.md](roadmap-producto.md), [plan-mejoras.md](plan-mejoras.md) ni
> [plan-monetizacion-admin.md](plan-monetizacion-admin.md) — los referencia y
> agrega las lentes que faltaban: gestión de ingeniería, código, y análisis
> de negocio/datos. Al final, una síntesis de qué aparece repetido en varias
> lentes — eso es lo que se prioriza primero.

---

## 1. Product Owner

Ya tiene su propio documento con el detalle: **[roadmap-producto.md](roadmap-producto.md)**
(Fase 0 look & feel → Fase 1 activación → Fase 2 cierre del loop → Fase 3
monetización). Resumen de la lente PO, no repetición:

- **Quick wins (alto impacto, bajo esfuerzo):** fotos de cancha, landing con
  identidad visual, estados vacíos con guía. Se sienten en un día de uso,
  cuestan poco.
- **Apuestas necesarias (alto impacto, esfuerzo real):** reglas de horario
  recurrentes, notificaciones push/email, login real. Sin esto no hay
  lanzamiento público defendible, sin importar cuánto se pula el resto.
- **Métrica que falta para priorizar con datos, no intuición:** no hay
  ningún tracking de eventos (ver sección 4, BA) — hoy cualquier
  priorización, incluida esta, es cualitativa. Antes de la Fase 3
  (monetización) hace falta al menos saber cuántos Futboleros abandonan
  entre "ver cancha" y "reservar".

---

## 2. App/Engineering Manager

Lente de equipo, proceso y riesgo de entrega — no de código en sí.

- **Cero ambiente de staging.** Todo push a `main` despliega directo a
  producción vía Vercel. No hay preview deployments revisados antes de
  mergear, no hay rama de desarrollo. Un solo commit malo (o una migración
  de base rota) es visible para usuarios reales al instante. Con un
  producto que mueve dinero (aunque sea P2P), esto es el gap de proceso más
  caro de ignorar.
- **Cero observabilidad en producción.** SPEC.md 6.1 ya eligió Sentry para
  monitoreo — nunca se instaló. Hoy, si algo falla en producción (un
  webhook de Supabase, un cron que no corre, un 500 en el upload de
  comprobante), el primer indicio es un AdminCancha quejándose, no una
  alerta.
- **Cero CI.** No hay un workflow que corra `npm run lint` / `npm run build`
  antes de mergear — hoy esa verificación depende de que quien commitea se
  acuerde de correrla a mano (que es lo que pasó toda esta sesión, pero no
  escala a un segundo desarrollador).
- **Bus factor 1 + cero code review.** Un solo desarrollador (asistido por
  IA) tomando cada decisión de arquitectura documentada en DECISIONS.md.
  Funciona para un MVP en solitario; es un riesgo real si mañana se suma
  alguien — no hay PRs, no hay historial de qué se discutió y descartó más
  allá de ese archivo.
- **Dependencias de borde de cuchillo.** Next.js 16 y Base UI (no Radix)
  son elecciones recientes con menos superficie de producción probada que
  las alternativas estables — aceptable para moverse rápido ahora, pero es
  deuda a vigilar en cada upgrade.

---

## 3. Software Engineer

Lente de código: qué es frágil, qué es inseguro, qué no va a escalar.

- **El login simplificado es una vulnerabilidad real, no solo una
  simplificación de producto.** `entrar()` (`app/login/actions.ts`) no tiene
  rate limiting ni CAPTCHA — cualquiera puede scriptear la creación masiva
  de cuentas o, peor, entrar a la cuenta de cualquier persona con solo
  saber su email. Ya está documentado como decisión temporal (DECISIONS.md),
  pero vale decirlo con el nombre técnico correcto: es un bypass de
  autenticación intencional, no un detalle menor.
- **N+1 de queries por todo el codebase, a propósito.** Documentado en
  DECISIONS.md ("sin selects anidados de PostgREST" porque el `Database`
  type está escrito a mano). Funciona bien a 20 canchas; en cuanto se migre
  a tipos generados (`supabase gen types`) vale la pena volver a joins
  anidados donde el patrón hoy es 3-4 queries secuenciales
  (`/admin/validaciones`, `/futbolero/reservas` son los más pesados).
- **Sin paginación en ningún lado.** Buscar, Mis Reservas, la cola de
  Validaciones y el dashboard de Insights traen todas las filas sin límite.
  Bien a la escala actual; es el primer cuello de botella real si un
  AdminCancha llega a cientos de reservas históricas.
- **Tipos de base de datos mantenidos a mano** (`lib/types/database.ts`) en
  vez de generados desde el schema real. Riesgo de que el tipo y la
  columna real diverjan silenciosamente después de la próxima migración —
  nada lo detectaría hasta un error en runtime.
- **Código de login con contraseña "comentado, no borrado"** (a pedido
  explícito) sigue viviendo en `app/login/actions.ts` y en el historial de
  `app/register/`. Es intencional y está documentado, pero cualquier
  ingeniero nuevo que lea el archivo sin el contexto de DECISIONS.md se va
  a confundir sobre cuál es el camino real.
- **Ningún test automatizado** (ver plan-mejoras.md #5) — la garantía de
  no-doble-reserva se probó una vez, a mano, con un script desechable. Es
  la corrección más crítica del negocio y no hay nada que la re-verifique
  en cada cambio futuro.

---

## 4. Business Analyst

Lente de datos, proceso de negocio y trazabilidad de requerimientos.

- **Gap entre spec y modelo de datos: "no-show" no es medible.** SPEC.md
  3.3 pide la tasa de no-show como métrica; la máquina de estados de
  `Reserva` (SPEC.md 5.2) nunca definió un estado de no-show. Es un
  requerimiento que nunca se pudo cumplir porque nadie lo trazó contra el
  modelo de datos al definirlo — el tipo de gap que una revisión de
  requerimientos debería atrapar antes de construir, no después.
- **Cero tracking de eventos/funnel.** No hay forma de responder preguntas
  de negocio básicas: ¿cuántos Futboleros ven una cancha y no llegan a
  reservar? ¿cuánto tiempo pasa en promedio entre que sube el comprobante y
  el admin confirma? ¿qué % de reservas expiran sin respuesta del admin?
  Esa última en particular es el riesgo de producto #1 que el propio
  SPEC.md nombra (disputas "pagué y no me confirmaron") — y hoy es
  imposible cuantificar qué tan seguido pasa.
- **Sin registro de auditoría de acciones del admin.** Confirmar/rechazar
  una reserva no deja rastro de "quién hizo qué cuándo" más allá del
  estado final — importante el día que un Futbolero dispute un rechazo.
- **Sin proceso definido para casos borde de negocio:** ¿qué pasa con las
  reservas activas de una cancha si el AdminCancha borra la cuenta? ¿hay
  un plazo de retención de comprobantes (SPEC.md 9 lo sugiere pero nunca
  se implementó)? ¿quién resuelve una disputa cuando el Futbolero dice que
  pagó y el admin dice que no le llegó nada? Ninguno de estos tiene un
  proceso documentado, ni humano ni en producto.
- **Sin aceptación de términos ni política de privacidad** pese a manejar
  capturas de pantalla bancarias (PII financiera real, ver SPEC.md 10.1).
  Es un gap de cumplimiento, no solo de producto.

---

## 5. Usuario (Futbolero + AdminCancha)

Lente de experiencia real, en primera persona — complementa, no repite,
Fase 0-2 de roadmap-producto.md.

**Como Futbolero:**
- "Subí mi comprobante y no tengo ninguna señal de que alguien lo está
  mirando — solo un texto que dice que 'normalmente' tarda 30 minutos.
  ¿Y si cierro la app? ¿Me entero cuando la vuelva a abrir, nada más?"
  (conecta directo con Fase 2 #1 de roadmap-producto.md — notificaciones).
- "Elegí una cancha por nombre y descripción nada más, no vi fotos, no vi
  dónde queda en el mapa, no vi si tiene baños o parqueo. Reservé medio a
  ciegas."
- "Después de jugar, nadie me pidió calificar la cancha — no sé si mi
  opinión importa o si eso existe."

**Como AdminCancha:**
- "Cargué mi primera cancha y no supe si ya estaba visible para los
  Futboleros o si me faltaba algo — no hubo ninguna confirmación tipo
  'listo, ya te pueden encontrar'."
- "Crear los horarios de toda la semana, uno por uno, para las próximas 4
  semanas, es la parte más tediosa de toda la app — y es literalmente lo
  primero que tengo que hacer antes de poder recibir una sola reserva."
- "Si me equivoco al cargar el número SINPE, no hay dónde corregirlo sin
  pedir ayuda técnica."

---

## Síntesis — qué aparece en más de una lente (prioridad real)

| Ítem | PO | Eng Manager | SWE | BA | Usuario |
|---|---|---|---|---|---|
| **Login real / seguridad de acceso** | ✅ | | ✅ | | ✅ |
| **Notificaciones (push/email)** | ✅ | | | ✅ (funnel de disputa) | ✅ |
| **Reglas de horario recurrentes** | ✅ | | | | ✅ |
| **Fotos de cancha** | ✅ | | | | ✅ |
| **Tests automatizados** | | ✅ | ✅ | | |
| **Tracking de eventos / analítica** | ✅ | | | ✅ | |
| **Observabilidad (Sentry) + staging** | | ✅ | | | |

Los primeros cuatro ítems aparecen en **al menos 3 de las 5 lentes** —
son el consenso real, no la opinión de un solo rol. Ahí es donde
empezaría el próximo ciclo de trabajo.
