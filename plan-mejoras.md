# Backlog de mejoras — post-QA end-to-end (Fase 0-3 de plan-ui-ux)

> **Estado: ejecutado el 2026-09-15.** Ver DECISIONS.md para el detalle de
> qué se implementó tal cual, qué se descartó (#2) y qué se bajó de alcance
> (#5). Este archivo queda como el registro original del hallazgo, no se
> reescribió retroactivamente.

> Generado tras un recorrido manual real contra el proyecto Supabase de
> producción (`npm run dev` local + `.env.local`): login simplificado como
> AdminCancha → crear cancha → crear horario → logout → login como
> Futbolero nuevo → Buscar → Detalle → Resumen/pago → subir comprobante →
> login como AdminCancha → `/admin/validaciones` → Confirmar → verificar
> que el Futbolero ve "Confirmada" en tiempo real sin recargar. **El
> camino crítico completo funciona de punta a punta.** Esto es la lista de
> hallazgos y pulido pendiente, no bugs bloqueantes.

## Encontrado durante el QA (ya corregido en esta sesión)

- Todos los `Button` que renderizaban como `<Link>` vía `render={<Link .../>}`
  disparaban un warning de Base UI (`nativeButton` esperaba un `<button>`
  nativo). Corregido agregando `nativeButton={false}` en cada uso
  (`app/page.tsx`, `app/admin/page.tsx`, `SlotPicker.tsx`, `EmptyState.tsx`,
  las dos pantallas de `reservar/[slotId]/`).

## Pendiente — prioridad alta (afecta confiabilidad percibida)

1. **`createSignedUrl` del comprobante puede devolver `null` en el primer
   render** justo después de subir el archivo (se vio una vez en el QA; al
   recargar `/admin/validaciones` la imagen ya aparecía). Ahora mismo el
   error se descarta en silencio:
   ```ts
   const { data } = await supabase.storage.from("comprobantes").createSignedUrl(...);
   comprobanteUrlFirmada = data?.signedUrl ?? null; // el `error` nunca se mira
   ```
   Acción: loguear el `error` (mínimo `console.error`, ver 10.5 de SPEC.md
   sobre logging estructurado de eventos clave) y agregar un reintento corto
   (1 reintento tras ~300ms) específicamente en esa llamada — es la única
   parte de la cola de validación que depende de un servicio externo con
   latencia variable.

## Pendiente — prioridad media (pulido de producto)

2. **Nombre del Futbolero en la cola de validación es el local-part del
   email** (ej. "futbolero.test") porque el login simplificado no pide
   nombre. Es consecuencia directa de la decisión ya documentada en
   DECISIONS.md (login sin contraseña, solo email). Dos salidas: agregar un
   campo "nombre" opcional al form de `/login`, o aceptarlo como parte del
   trade-off temporal — no tocar hasta que se reactive el login real.
3. **Rating 0.0 con estrellas vacías** se ve un poco pobre en canchas sin
   reseñas (`CanchaCard`, detalle de cancha). Mostrar "Sin calificaciones
   todavía" en vez de "0.0" cuando `rating_promedio = 0` y no hay filas en
   `calificaciones` sería más honesto que un número que parece una nota real.
4. **Los forms de admin sin restylar** (`admin/canchas/nueva`,
   `admin/canchas/[id]/slots/nueva`) son ahora el contraste visual más
   fuerte contra el resto de la app (inputs planos, sin el sistema de
   diseño). Quedaron fuera del alcance aprobado de Fase 0-3 a propósito,
   pero son lo primero que un AdminCancha nuevo ve al crear su cuenta — vale
   la pena priorizarlos antes que pantallas menos visitadas como Calificar
   o Perfil.

## Pendiente — prioridad baja / estructural

5. **Cero tests automatizados** en todo el proyecto (ya señalado en
   DECISIONS.md desde el slice inicial, sigue sin resolverse). Con una
   máquina de estados de `Reserva` + RLS + triggers + Realtime ya en
   producción, el mayor riesgo de regresión silenciosa está justo ahí.
   Sugerido como primer test: un test de integración que ejercite la
   carrera de doble-reserva sobre el mismo `Slot` (dos inserts concurrentes,
   verificar que solo uno gana) — es la garantía más crítica del negocio
   (SPEC.md 10.2) y hoy solo está validada por lectura de código, nunca
   ejecutada bajo concurrencia real.
6. **Subida de comprobante vía cámara no probada en dispositivo real** — el
   QA de esta sesión corrió en un navegador embebido sin cámara; se simuló
   el `<input type="file">` inyectando un archivo por JS. El atributo
   `capture="environment"` (que abre la cámara trasera en mobile) nunca se
   ejercitó de verdad. Vale una prueba manual desde un teléfono real antes
   de considerar el flujo completamente validado.
7. **`Mis reservas` sin tabs activas/pasadas** (doc UI/UX 5.7) — ya
   documentado como diferido, sigue pendiente.

## No son bugs (confirmado durante el QA, dejar constancia)

- El filtro de rating en Buscar, el `SlotPicker` por día, la compresión +
  preview del comprobante, el countdown de expiración en la cola de
  validación, y el Realtime en ambas direcciones (Futbolero ve
  confirmación, Admin ve nuevos pendientes) — todo funcionó como estaba
  diseñado en la primera pasada real contra Supabase.
