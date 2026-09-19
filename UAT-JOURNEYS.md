# Dale Cancha — UAT: Customer Journeys & Test Log

> UAT pass for the full app, both roles (Futbolero / AdminCancha). Complements
> the 2 golden paths already in `e2e/` (Testing.md Fase 6) with the rest of
> the screens. Journeys are grouped by role; each has the exact UI steps,
> the expected result, and — once run — a pass/fail + notes.
>
> Environment: `next dev` + local Supabase (`npx supabase start`), never
> production (see `e2e/helpers/db.ts` safety check). Login is the simplified
> dev flow: email + role radio on `/login`, no password (`DECISIONS.md`).

Legend: ✅ pass · ❌ fail (bug) · ⚠️ pass with issue · ⬜ not yet run

---

## A. Futbolero journeys

### A1. Login / account switch
1. Go to `/login`.
2. Enter an email, pick "Quiero jugar" (futbolero).
3. Click "Entrar".
4. **Expect**: redirected to `/futbolero/canchas`, session persists on reload.

Status: ⬜ — covered by `e2e/helpers/auth.ts`, exercised in every other futbolero spec.

### A2. Browse & search canchas
1. On `/futbolero/canchas`, see list of canchas (`ListaCanchas`).
2. Type a partial name into the search box ("Buscá por cancha").
3. **Expect**: list filters live to matching canchas; clearing the box restores the full list; searching for nonsense shows an empty state, not a crash.

Status: ⬜

### A3. Cancha detail → slot picker
1. Click into a cancha from the list.
2. **Expect**: name, photos/amenities, rating, day tabs (Hoy/Mañana/…) with time slots per day.
3. Switch day tabs — slot list updates per day.
4. Click an available slot, then "Continuar".
5. **Expect**: navigates to the reservation/payment screen for that slot.

Status: ⬜ — day-tab + slot selection covered in `e2e/reserva-futbolero.spec.ts`; explicit tab-switching across multiple days not yet covered.

### A4. Reserve → pay via SINPE → upload comprobante (golden path)
1. From a slot, land on the payment screen: shows exact amount + cancha's SINPE number.
2. Click "Ya pagué, adjuntar comprobante".
3. Upload an image file.
4. Click "Enviar comprobante".
5. **Expect**: redirected to `/futbolero/reservas/[id]`, status shows "En revisión" (pendiente_validacion), without reload.

Status: ⬜ — this is `e2e/reserva-futbolero.spec.ts`, already green per `HANDOFF-TESTING.md`. Re-run as part of this pass.

### A5. Cancel a reservation before uploading a comprobante
1. Reserve a slot but stop right after `creada` (before uploading a comprobante).
2. On the reservation page, click "Cancelar reserva".
3. Confirm in the dialog ("Sí, cancelar").
4. **Expect**: reservation moves to `cancelada`, the slot becomes bookable again by someone else.
5. Also check: once a comprobante *has* been uploaded, the cancel option should no longer be available/should be rejected server-side (`cancelarReserva` throws "ya no se puede cancelar desde acá" — SPEC 5.2).

Status: ⬜ — new spec: `e2e/futbolero-cancelar-reserva.spec.ts`.

### A6. Admin rejects the comprobante → futbolero sees the reason, in real time
1. Futbolero uploads a comprobante (as in A4).
2. In a second session, AdminCancha rejects it with a motivo.
3. **Expect**: without reloading, the futbolero's screen updates to "Rechazada" and shows the exact motivo text; the slot is released.

Status: ⬜ — new spec: `e2e/admin-rechazar-comprobante.spec.ts`. This is the mirror of the existing "aprobar" golden path and is the other half of `ReservaEstado`'s realtime code path (the one with the documented `getSession()` bug fix — worth re-verifying explicitly).

### A7. Reservation expires automatically (no admin decision in time)
1. Seed a `pendiente_validacion` reserva with `expira_at` already in the past.
2. Call the cron endpoint `/api/cron/expirar-reservas` (as the real Vercel Cron would).
3. **Expect**: reserva flips to `expirada`, slot releases. (Already unit-tested per `app/api/cron/expirar-reservas/route.test.ts` — UAT here is a smoke check that the countdown UI (`ContadorExpiracion`) visibly counts down and communicates the deadline before that happens.)

Status: ⬜ — visual/manual check of the countdown component; logic already covered by existing unit tests.

### A8. "Mis reservas" list
1. Go to `/futbolero/reservas`.
2. **Expect**: reservas grouped/sorted sensibly, each with a status badge (`EstadoReservaBadge`) matching its real state; clicking one opens its detail page.
3. With zero reservas, expect a sane empty state, not a blank screen.

Status: ⬜ — new spec (list smoke test folded into `e2e/futbolero-mis-reservas-perfil.spec.ts`).

### A9. Perfil
1. Go to `/futbolero/perfil`.
2. **Expect**: shows the logged-in user's name + email.
3. Click "Salir" → logged out, redirected to `/login`, and a protected route (`/futbolero/canchas`) now redirects back to `/login`.

Status: ⬜ — new spec, same file as A8.

### A10. Cobro grupal (split payment with friends) — public, no-auth path
1. Reserve a slot, on the reservation page (state `creada`, before paying solo) start "cobro grupal" and choose a number of contributors (2–30).
2. **Expect**: a public link (`/pago/[token]`) is generated.
3. Open that link in a fresh, unauthenticated context (this is the interesting part — no login at all).
4. Fill in a contributor's name + optional phone, upload a comprobante image for their share.
5. **Expect**: the aporte moves to "En revisión"; the organizer's reservation screen shows the running tally of aportes and their individual states.
6. AdminCancha opens the validaciones queue → sees the aporte separately from a plain-comprobante reserva (`ColaAportes`, distinct from `ColaValidacion`) → confirms it.
7. **Expect**: aporte flips to "Pagó" everywhere, without reload.
8. Edge case: this feature is gated by a feature flag (`cobroGrupalHabilitado`) — confirm the UI to start a cobro grupal simply doesn't appear when the flag is off, rather than erroring.

Status: ⬜ — new spec: `e2e/futbolero-cobro-grupal.spec.ts`. Highest-complexity journey in the app (public unauthenticated route + a second approval queue) — prioritize this one.

---

## B. AdminCancha journeys

### B1. Login as AdminCancha
1. `/login` → same email field, "Tengo una cancha" radio → Entrar.
2. **Expect**: redirected to `/admin`.

Status: ⬜ — covered via `loginComo(page, email, "admin_cancha")`.

### B2. Create a cancha
1. `/admin/canchas/nueva`.
2. Fill nombre, número SINPE, descripción, política de cancelación.
3. Submit.
4. **Expect**: new cancha appears in `/admin/canchas`; validation: submitting without nombre/SINPE shows an inline error, doesn't silently fail.

Status: ⬜ — new spec: `e2e/admin-crear-cancha-y-slot.spec.ts`.

### B3. Edit cancha info
1. `/admin/canchas/[id]/info`.
2. Update fields (fotos, amenidades, ubicación, reglas, SINPE).
3. **Expect**: changes persist and are reflected on the futbolero-facing detail page (A3).

Status: ⬜ — manual check recommended (photo upload flow is heavier to script reliably); not automated in this pass.

### B4. Create a slot (horario)
1. With 1 cancha: `/admin/horarios` redirects straight to that cancha's `slots/nueva`. With >1 cancha: shows a picker first (`SelectorCancha`).
2. Fill fecha/hora_inicio/hora_fin/precio, submit.
3. **Expect**: slot appears in the upcoming list on the same page; it becomes reservable by a futbolero on the detail page.
4. Edge case: hora_fin before/equal hora_inicio, or precio ≤ 0 — expect a validation error, not a broken slot in the DB.

Status: ⬜ — same spec as B2, plus horarios routing check with 1 vs 2+ canchas.

### B5. Validaciones queue — confirm
1. `/admin/validaciones` with a pending reserva.
2. See futbolero name/phone, cancha, horario, monto, comprobante image (signed URL, expires in 5 min per README/HANDOFF).
3. Click "Confirmar reserva".
4. **Expect**: item drops out of the queue; futbolero sees "Confirmada" in real time (existing golden path `e2e/aprobar-admin.spec.ts`).

Status: ⬜ — re-run existing spec as part of this pass.

### B6. Validaciones queue — reject
See A6 — same journey, admin side.

### B7. Insights dashboard
1. `/admin/insights`.
2. **Expect**: stat cards render (occupancy, confirmed revenue, cancellation/no-show rate, rating trend, recurring-vs-new split per SPEC 3.3), heatmap and trend chart render without throwing, CSV export button produces a file (`/api/insights/exportar`).
3. With a cancha that has zero reservas: expect empty/zero states, not a crash — `datosPanel`/`insightsPro.ts` are explicitly *not* unit-tested per `HANDOFF-TESTING.md` §Fase 3, so this screen is the one place that logic gets exercised at all right now.

Status: ⬜ — new smoke spec: `e2e/admin-insights.spec.ts`. Flag as **highest-value new coverage**, since it's the one screen with zero existing automated coverage of any kind.

### B8. "Más" menu & logout
1. `/admin/mas` → links to Canchas / Estadísticas / Nueva cancha all navigate correctly.
2. "Salir" logs out, protected admin routes then redirect to `/login`.

Status: ⬜ — folded into `e2e/admin-crear-cancha-y-slot.spec.ts`.

### B9. Multi-cancha admin — data isolation
1. Admin A owns cancha X, Admin B owns cancha Y.
2. **Expect**: Admin B's validaciones queue never shows cancha X's reservas; `/admin/canchas/[X]/...` routes 404/redirect for Admin B (ownership check already covered by `_ownership.test.ts` unit tests + RLS pgTAP tests — UAT here is just confirming the UI doesn't leak anything extra, e.g. cancha names in a dropdown).

Status: ⬜ — spot-checked manually rather than scripted (mostly redundant with existing RLS + ownership unit coverage).

---

## C. Cross-cutting / non-happy-path checks

- **Double-booking under concurrency**: already covered by `tests/integration/concurrencia-doble-reserva.test.ts` (Fase 2) — not re-tested here, just confirmed still green.
- **Direct URL access without auth**: hitting any `/futbolero/*` or `/admin/*` route logged out redirects to `/login`; hitting another user's `/futbolero/reservas/[id]` 404s/blocks rather than leaking data.
- **Comprobante privacy**: a comprobante URL is a signed URL that expires — confirm an expired/copy-pasted link doesn't work after 5 minutes (spot check, not scripted — timing-dependent).
- **Mobile viewport**: spot-check the core futbolero flow (A3–A4) at a phone width, since this is a PWA aimed at mobile SINPE users — bottom nav bar, sheets, and the comprobante uploader are the highest-risk components.
