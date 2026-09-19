import { test, expect } from "@playwright/test";
import { loginComo } from "./helpers/auth";

// UAT A8/A9 (ver UAT-JOURNEYS.md): "Mis reservas" (estado vacío, ya que este
// futbolero nuevo no tiene ninguna) y "Perfil" (datos + logout).
test.describe("Futbolero: mis reservas (vacío) y perfil", () => {
  test("mis reservas muestra un estado vacío sano, no una pantalla en blanco", async ({ page }) => {
    const email = `e2e-vacio-${Date.now()}@example.com`;
    await loginComo(page, email, "futbolero");

    await page.goto("/futbolero/reservas");
    await expect(page.getByText("No tenés reservas activas")).toBeVisible();
  });

  test("perfil muestra el email logueado y el logout redirige a /login", async ({ page }) => {
    const email = `e2e-perfil-${Date.now()}@example.com`;
    await loginComo(page, email, "futbolero");

    await page.goto("/futbolero/perfil");
    await expect(page.getByText(email)).toBeVisible();

    await page.getByRole("main").getByRole("button", { name: "Salir" }).click();
    await page.waitForURL(/\/login/);

    // Ruta protegida, ya sin sesión: debe volver a /login, no mostrar contenido.
    await page.goto("/futbolero/canchas");
    await page.waitForURL(/\/login/);
  });
});
