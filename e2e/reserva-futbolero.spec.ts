import { test, expect } from "@playwright/test";
import { sembrarCanchaConSlot, limpiar, type CanchaSembrada } from "./helpers/db";
import { loginComo } from "./helpers/auth";
import { comprobanteDePrueba } from "./helpers/fixtures";

// Camino dorado 1 de TESTING.md Fase 6: buscar cancha -> ver detalle ->
// reservar slot -> subir comprobante -> ver estado "pendiente de
// validación". Corre contra next dev + el Supabase local (ver
// playwright.config.ts) — nunca contra producción.
test.describe("Camino dorado: futbolero reserva y sube comprobante", () => {
  let seed: CanchaSembrada;

  test.beforeAll(async () => {
    seed = await sembrarCanchaConSlot();
  });

  test.afterAll(async () => {
    await limpiar({ canchaId: seed.canchaId, adminId: seed.adminId });
  });

  test("de la búsqueda al comprobante enviado", async ({ page }) => {
    const email = `e2e-futbolero-${Date.now()}@example.com`;
    await loginComo(page, email, "futbolero");

    await page.goto("/futbolero/canchas");
    await page.getByPlaceholder("Buscá por cancha").fill(seed.nombreCancha);
    await page.getByRole("link", { name: new RegExp(seed.nombreCancha) }).click();

    await expect(page.getByRole("heading", { name: seed.nombreCancha })).toBeVisible();

    // El slot sembrado es "mañana" — único día con etiqueta predecible sin
    // importar en qué día de la semana corra el test (ver helpers/db.ts).
    await page.getByRole("tab", { name: "Mañana" }).click();
    await page.getByRole("button", { name: /^18:00/ }).click();
    // Es un <a href> real (navega), pero el design system lo renderiza con
    // role="button" (ver components/ui/button.tsx, nativeButton={false}).
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("Pagá por SINPE Móvil")).toBeVisible();
    await page.getByRole("button", { name: "Ya pagué, adjuntar comprobante" }).click();

    await expect(page.getByText("Adjuntá tu comprobante")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(comprobanteDePrueba());
    await expect(page.getByRole("button", { name: "Enviar comprobante" })).toBeVisible();
    await page.getByRole("button", { name: "Enviar comprobante" }).click();

    await page.waitForURL(/\/futbolero\/reservas\/.+/);
    await expect(page.getByText("En revisión")).toBeVisible();
  });
});
