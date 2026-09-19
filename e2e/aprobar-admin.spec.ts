import { test, expect } from "@playwright/test";
import { sembrarReservaPendiente, limpiar } from "./helpers/db";
import { loginComo } from "./helpers/auth";

type Seed = Awaited<ReturnType<typeof sembrarReservaPendiente>>;

// Camino dorado 2 de TESTING.md Fase 6: el admin ve la cola de validación,
// aprueba un comprobante, y la reserva del futbolero pasa a "confirmada" en
// su pantalla SIN recargar — prueba el realtime de punta a punta, no solo
// el endpoint de confirmar. Arranca con una reserva ya en
// pendiente_validacion sembrada directo en la base (el camino de subir el
// comprobante de verdad ya lo cubre reserva-futbolero.spec.ts) para no
// duplicar ese tramo y mantener este test enfocado en admin + realtime.
test.describe("Camino dorado: admin aprueba y el futbolero lo ve sin recargar", () => {
  let seed: Seed;

  test.beforeAll(async () => {
    seed = await sembrarReservaPendiente();
  });

  test.afterAll(async () => {
    await limpiar({ canchaId: seed.canchaId, adminId: seed.adminId, futboleroId: seed.futboleroId });
  });

  test("aprobar en la cola de validación actualiza en vivo la pantalla del futbolero", async ({ browser }) => {
    const contextoFutbolero = await browser.newContext();
    const contextoAdmin = await browser.newContext();
    try {
      const paginaFutbolero = await contextoFutbolero.newPage();
      await loginComo(paginaFutbolero, seed.futboleroEmail, "futbolero");
      await paginaFutbolero.goto(`/futbolero/reservas/${seed.reservaId}`);
      await expect(paginaFutbolero.getByText("En revisión")).toBeVisible();

      const paginaAdmin = await contextoAdmin.newPage();
      await loginComo(paginaAdmin, seed.adminEmail, "admin_cancha");
      await paginaAdmin.goto("/admin/validaciones");
      await expect(paginaAdmin.getByText(seed.nombreCancha)).toBeVisible();
      await paginaAdmin.getByRole("button", { name: "Confirmar reserva" }).click();
      await expect(paginaAdmin.getByRole("button", { name: "Confirmar reserva" })).toHaveCount(0);

      // Sin recargar: el toast + el cambio de estado llegan por
      // postgres_changes (ver ReservaEstado.tsx). Match exacto porque el
      // toast ("Tu reserva pasó a: Confirmada") también contiene el texto.
      await expect(paginaFutbolero.getByText("Confirmada", { exact: true })).toBeVisible({ timeout: 15_000 });
    } finally {
      await contextoFutbolero.close();
      await contextoAdmin.close();
    }
  });
});
