import { test, expect } from "@playwright/test";
import { sembrarCanchaConSlot, limpiar, type CanchaSembrada } from "./helpers/db";
import { loginComo } from "./helpers/auth";

// UAT B7 (ver UAT-JOURNEYS.md): smoke test del dashboard de insights.
// datosPanel/insightsPro.ts no tienen cobertura unitaria (ver
// HANDOFF-TESTING.md, Fase 3) -- esta es la única verificación automatizada
// de que la pantalla no explota, con una cancha que además tiene cero
// reservas confirmadas (caso "sin datos").
test.describe("Admin: dashboard de estadísticas no explota sin datos", () => {
  let seed: CanchaSembrada;

  test.beforeAll(async () => {
    seed = await sembrarCanchaConSlot();
  });

  test.afterAll(async () => {
    await limpiar({ canchaId: seed.canchaId, adminId: seed.adminId });
  });

  test("carga con estado vacío/cero, exporta CSV sin error de servidor", async ({ page }) => {
    // Tres navegaciones (30/7/90 días) contra Turbopack en dev pueden superar
    // el timeout por defecto de 30s del test si algo se compila en frío.
    test.setTimeout(60_000);
    await loginComo(page, seed.adminEmail, "admin_cancha");

    await page.goto("/admin/insights");
    await expect(page.getByRole("heading", { name: "Estadísticas" })).toBeVisible();
    await expect(page.getByText("Ingresos confirmados", { exact: true })).toBeVisible();
    await expect(page.getByText("Ocupación", { exact: true })).toBeVisible();
    await expect(page.getByText("Tasa de cancelación")).toBeVisible();
    await expect(page.getByText("Rating promedio")).toBeVisible();
    await expect(page.getByText("Ocupación por día y hora")).toBeVisible();
    await expect(page.getByText("Ingresos por semana")).toBeVisible();

    // Los otros períodos también deben cargar sin tirar un error de servidor.
    await page.goto("/admin/insights?periodo=7");
    await expect(page.getByRole("heading", { name: "Estadísticas" })).toBeVisible();
    await page.goto("/admin/insights?periodo=90");
    await expect(page.getByRole("heading", { name: "Estadísticas" })).toBeVisible();

    // page.waitForEvent("download") resultó poco confiable contra el dev
    // server (Turbopack) en esta máquina -- el mismo request, repetido,
    // reportaba a veces 200 y a veces 503 desde las herramientas de
    // navegador, mientras el log del propio servidor mostraba 200 siempre.
    // En vez de depender de que el navegador detecte la descarga, se pide
    // la respuesta HTTP directamente (misma sesión/cookies que `page`) y se
    // verifica el contenido real: status, header de descarga, y que el CSV
    // tenga al menos la fila de encabezado.
    // El botón se renderiza como <a href> por debajo (para que el navegador
    // pueda manejarlo como descarga nativa), pero el componente Button de
    // base-ui fuerza role="button" en el accessibility tree -- por eso
    // getByRole("link", ...) nunca resolvía, en ningún run.
    const exportUrl = await page.getByRole("button", { name: "Exportar CSV" }).getAttribute("href");
    const respuesta = await page.request.get(exportUrl!);
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()["content-disposition"]).toMatch(/^attachment;.*\.csv"$/);
    const csv = await respuesta.text();
    expect(csv.split("\n")[0]).toBe("cancha,fecha,hora,futbolero,estado,monto");
  });
});
