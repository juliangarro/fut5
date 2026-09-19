import { test, expect } from "@playwright/test";
import { sembrarReservaPendiente, limpiar } from "./helpers/db";
import { loginComo } from "./helpers/auth";

type Seed = Awaited<ReturnType<typeof sembrarReservaPendiente>>;

// UAT A6/B6 (ver UAT-JOURNEYS.md) — espejo de e2e/aprobar-admin.spec.ts,
// pero por el camino de rechazo: el admin rechaza con un motivo y el
// futbolero debe ver "Rechazada" + el motivo exacto, en vivo, sin recargar.
// Es la otra mitad del path de realtime de ReservaEstado.tsx que el golden
// path de aprobación no ejercita.
test.describe("Camino: admin rechaza y el futbolero ve el motivo sin recargar", () => {
  let seed: Seed;

  test.beforeAll(async () => {
    seed = await sembrarReservaPendiente();
  });

  test.afterAll(async () => {
    await limpiar({ canchaId: seed.canchaId, adminId: seed.adminId, futboleroId: seed.futboleroId });
  });

  test("rechazar en la cola de validación actualiza en vivo la pantalla del futbolero", async ({ browser }) => {
    const contextoFutbolero = await browser.newContext();
    const contextoAdmin = await browser.newContext();
    const motivo = "El monto no coincide con el precio del horario";
    try {
      const paginaFutbolero = await contextoFutbolero.newPage();
      await loginComo(paginaFutbolero, seed.futboleroEmail, "futbolero");
      await paginaFutbolero.goto(`/futbolero/reservas/${seed.reservaId}`);
      await expect(paginaFutbolero.getByText("En revisión")).toBeVisible();

      const paginaAdmin = await contextoAdmin.newPage();
      await loginComo(paginaAdmin, seed.adminEmail, "admin_cancha");
      await paginaAdmin.goto("/admin/validaciones");
      await expect(paginaAdmin.getByText(seed.nombreCancha)).toBeVisible();
      await paginaAdmin.getByRole("button", { name: "Rechazar con motivo" }).click();
      await paginaAdmin.getByLabel("Motivo del rechazo").fill(motivo);
      await paginaAdmin.getByRole("button", { name: "Confirmar rechazo" }).click();
      await expect(paginaAdmin.getByRole("button", { name: "Rechazar con motivo" })).toHaveCount(0);

      await expect(paginaFutbolero.getByText("Rechazada", { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(paginaFutbolero.getByText(motivo)).toBeVisible();
    } finally {
      await contextoFutbolero.close();
      await contextoAdmin.close();
    }
  });
});
