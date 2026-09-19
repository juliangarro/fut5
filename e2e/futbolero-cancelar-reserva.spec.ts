import { test, expect } from "@playwright/test";
import { sembrarCanchaConSlot, limpiar, type CanchaSembrada } from "./helpers/db";
import { loginComo } from "./helpers/auth";

// UAT A5 (ver UAT-JOURNEYS.md): reservar un slot, pero cancelar ANTES de
// subir comprobante (reserva en estado `creada`) — la reserva debe pasar a
// `cancelada` y el slot debe quedar libre de nuevo para otro futbolero.
test.describe("Futbolero cancela una reserva antes de pagar", () => {
  let seed: CanchaSembrada;

  test.beforeAll(async () => {
    seed = await sembrarCanchaConSlot();
  });

  test.afterAll(async () => {
    await limpiar({ canchaId: seed.canchaId, adminId: seed.adminId });
  });

  test("cancelar antes de subir comprobante libera el slot", async ({ page }) => {
    const email = `e2e-cancelar-${Date.now()}@example.com`;
    await loginComo(page, email, "futbolero");

    await page.goto(`/futbolero/canchas/${seed.canchaId}`);
    await page.getByRole("tab", { name: "Mañana" }).click();
    await page.getByRole("button", { name: /^18:00/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Este submit crea la Reserva en estado `creada` (ver actions.ts) y
    // navega a la pantalla de subir comprobante — no la subimos, vamos a
    // "mis reservas" para llegar al detalle como lo haría un usuario real.
    await page.getByRole("button", { name: "Ya pagué, adjuntar comprobante" }).click();
    await expect(page.getByText("Adjuntá tu comprobante")).toBeVisible();

    await page.goto("/futbolero/reservas");
    await page.getByText(seed.nombreCancha).first().click();
    await page.waitForURL(/\/futbolero\/reservas\/.+/);

    await page.getByRole("button", { name: "Cancelar reserva" }).click();
    await expect(page.getByText("¿Cancelar esta reserva?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, cancelar" }).click();

    await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();

    // El slot debe volver a estar disponible: otro futbolero puede reservarlo.
    const contextoOtro = await page.context().browser()!.newContext();
    try {
      const paginaOtro = await contextoOtro.newPage();
      await loginComo(paginaOtro, `e2e-otro-${Date.now()}@example.com`, "futbolero");
      await paginaOtro.goto(`/futbolero/canchas/${seed.canchaId}`);
      await paginaOtro.getByRole("tab", { name: "Mañana" }).click();
      await expect(paginaOtro.getByRole("button", { name: /^18:00/ })).toBeEnabled();
    } finally {
      await contextoOtro.close();
    }
  });
});
