# Canchas Fútbol 5 — Costa Rica

PWA de reservas para canchas de fútbol 5, con pago manual por SINPE Móvil.
Ver [SPEC.md](./SPEC.md) para el producto completo y [DECISIONS.md](./DECISIONS.md)
para decisiones de diseño tomadas durante la implementación.

## Stack

Next.js (App Router) + TypeScript + Tailwind, sobre Supabase (Postgres +
Auth + Storage + Realtime). Ver SPEC.md sección 6.

## Setup

1. Creá un proyecto en [supabase.com](https://supabase.com) (o corré uno
   local con `npx supabase start`, requiere Docker).
2. Copiá `.env.example` a `.env.local` y completá las credenciales del
   proyecto (Project Settings → API).
3. Aplicá las migraciones:
   ```bash
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```
   o, en local: `npx supabase start` (aplica `supabase/migrations/*.sql`
   automáticamente).
4. Instalá dependencias y corré el servidor de desarrollo:
   ```bash
   npm install
   npm run dev
   ```
5. **Importante**: las migraciones en `supabase/migrations/` nunca se
   corrieron contra una base real durante esta sesión (sin Docker
   disponible en el entorno de desarrollo). Revisalas antes de aplicarlas
   a un proyecto real — ver la advertencia al final de DECISIONS.md.

## Slice vertical implementado

Reserva de un Slot → subida de comprobante SINPE → validación manual del
AdminCancha → confirmación/rechazo, con estado en tiempo real para el
Futbolero (SPEC.md secciones 3 y 5). Incluye:

- Registro/login por email+password, con selección de rol (Futbolero /
  AdminCancha).
- Futbolero: buscar canchas, ver horarios disponibles (próximos 14 días),
  reservar un Slot, subir comprobante, ver estado en tiempo real, cancelar
  antes de subir comprobante, ver "mis reservas".
- AdminCancha: crear cancha, crear horarios (Slots) individuales, cola de
  validación con comprobante (URL firmada, expira en 5 min), confirmar o
  rechazar con motivo.
- Expiración automática de reservas sin validar dentro de la ventana de
  retención (default 30 min, configurable) vía Vercel Cron.

**No implementado todavía** (ver DECISIONS.md): generador automático de
Slots desde reglas de horario recurrentes, OAuth social, dashboard de
insights, calificaciones, notificaciones push/email, exportes CSV/PDF.

## Verificación manual de este slice

Con un proyecto Supabase configurado y migraciones aplicadas:

1. Registrar una cuenta AdminCancha → crear una cancha → crear un slot para
   mañana.
2. Registrar una segunda cuenta (otra sesión/navegador) como Futbolero →
   buscar la cancha → reservar el slot → confirmar que aparecen el monto y
   el número SINPE.
3. Subir cualquier imagen como comprobante → confirmar que el estado pasa a
   "Comprobante en revisión" sin recargar la página (realtime).
4. Desde la cuenta AdminCancha, ir a la cola de validación de esa cancha →
   ver la imagen del comprobante → confirmar la reserva.
5. Volver a la pestaña del Futbolero → confirmar que el estado cambia a
   "Confirmada" sin recargar.
6. Repetir con "Rechazar" (requiere motivo) y confirmar que el Futbolero ve
   el motivo.
7. Con Docker corriendo, correr `npx supabase db reset` para validar que
   las migraciones aplican limpio de cero.

Este flujo **no se ejecutó en esta sesión** por falta de Docker/proyecto
Supabase conectado — queda como el primer paso de verificación pendiente.
