# Prompt para Claude Code / Cowork

Pegá esto en Claude Code, con el repo `canchas-fut5-cr` abierto y la carpeta
`design_handoff_dale_cancha/` copiada dentro del repo.

---

Vas a rediseñar la UI de este proyecto (Next.js App Router + Tailwind v4 +
shadcn/ui, Supabase) siguiendo el diseño que está en
`design_handoff_dale_cancha/`. Leé primero `README.md` de esa carpeta: tiene
los tokens exactos, las once pantallas y el comportamiento. El archivo
`Dale Cancha.dc.html` es la referencia visual (un prototipo HTML, no código
para copiar); ábrilo en el navegador y mirá el bloque "Turno 2 · dirección
elegida": esa es la dirección aprobada. Los tres frames del "Turno 1" son
alternativas descartadas — ignoralas.

Reglas del trabajo:

1. **No cambies la lógica de negocio ni el esquema.** Las server actions, las
   rutas de API, las policies de Supabase, la máquina de estados de `Reserva`
   y el flujo de pago SINPE se mantienen tal como están. Es un rediseño de
   interfaz.
2. **Los tokens primero.** Reemplazá la paleta de `app/globals.css` por los
   tokens de la sección "Design tokens" del README (crema/terracota/sage) y
   cargá Figtree con `next/font/google` como `--font-sans`. Todo lo demás debe
   consumir esos tokens; no dejes hex sueltos en componentes.
3. **Una sola voz tipográfica: Figtree.** Los títulos usan Figtree 700 con
   `letter-spacing: -0.02em`, no una display face aparte.
4. **Respetá los mínimos de accesibilidad** que ya define
   `plan-ui-ux-canchas-fut5-cr.md`: 16px en texto interactivo, área táctil de
   44px, y color + ícono + texto juntos para cada estado de reserva (nunca
   solo color).
5. **Trabajá en orden y commiteá por pantalla**, corriendo `npm run lint` y
   `npx tsc --noEmit` antes de cada commit.

Orden de implementación:

1. `app/globals.css` — tokens nuevos + fuente.
2. `components/ui/*` — que button, input, card, badge y tabs tomen los radios
   de píldora (999px) y los nuevos tokens. Es donde se gana la mayor parte del
   look; no reescribas los componentes, ajustá variantes.
3. `components/NavBar.tsx` — header en desktop y **bottom tab bar en mobile**
   (Buscar / Mis reservas / Perfil para Futbolero; Panel / Validaciones /
   Horarios / Más para AdminCancha). Ver "Navegación" en el README.
4. `components/shared/CanchaCard.tsx` + `app/futbolero/canchas/ListaCanchas.tsx`
   — rejilla de 2 columnas en mobile, chips de amenidad y orden.
5. `components/shared/SlotPicker.tsx` — agrupación por franja (Mañana / Tarde /
   Noche) con pastillas, barra inferior fija con monto + "Continuar".
6. `app/futbolero/canchas/[canchaId]/reservar/[slotId]/` — fusionar el resumen
   y la subida de comprobante en una hoja inferior (bottom sheet) sobre el
   detalle, con contador de retención. Mantené la server action `confirmarPago`
   y `ComprobanteUploader` con sus reintentos.
7. `components/ReservaEstado.tsx` + `components/shared/EstadoReservaBadge.tsx`
   — nueva línea de tiempo de 3 pasos y badges de estado con los colores del
   README.
8. `app/futbolero/reservas/ListaReservas.tsx` — tabs Activas / Pasadas en
   píldora, filas con badge y una línea de "qué sigue".
9. `app/admin/layout.tsx` — sidebar fijo en desktop con contador de
   validaciones pendientes.
10. `app/admin/page.tsx`, `components/ColaValidacion.tsx`,
    `app/admin/insights/page.tsx` + `components/admin/OcupacionHeatmap.tsx` y
    `IngresosTrend.tsx` — panel, cola y estadísticas según el README.

Cuando termines, listame qué archivos tocaste y qué quedó fuera.
