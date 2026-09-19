import { test, expect } from "@playwright/test";
import { admin as adminDb, limpiar, fechaEnDias } from "./helpers/db";
import { loginComo } from "./helpers/auth";

// UAT B2/B4/B8 (ver UAT-JOURNEYS.md): admin nuevo (sin canchas todavía)
// crea su primera cancha, luego un horario para ella (con 1 sola cancha
// /admin/horarios debe saltar directo al formulario de esa cancha — D6 en
// el código), y sale por el menú "Más".
test.describe("Admin: crear cancha, crear horario, logout", () => {
  const email = `e2e-admin-crea-${Date.now()}@example.com`;
  let canchaId: string | undefined;
  let adminId: string | undefined;

  test.afterAll(async () => {
    await limpiar({ canchaId, adminId });
  });

  test("crear cancha -> crear horario -> aparece publicado -> salir", async ({ page }) => {
    await loginComo(page, email, "admin_cancha");

    const nombreCancha = `Cancha UAT ${Date.now()}`;
    await page.goto("/admin/canchas/nueva");
    await page.getByLabel("Nombre").fill(nombreCancha);
    await page.getByLabel("Número SINPE Móvil (para recibir pagos)").fill("8888-1234");
    await page.getByRole("button", { name: "Crear cancha" }).click();

    await page.waitForURL(/\/admin\/canchas(\/|$)/);
    // Scoped a heading: el nombre de la cancha también aparece en el
    // anuncio de accesibilidad de Next.js (role="alert"), que duplicaba el
    // match en modo "strict" de Playwright.
    await expect(page.getByRole("heading", { name: nombreCancha })).toBeVisible();

    // Resolver el id para la limpieza posterior sin acoplar el test a la
    // redirección exacta (puede llevar a /admin o a /admin/canchas).
    const { data: cancha } = await adminDb
      .from("canchas")
      .select("id, admin_id")
      .eq("nombre", nombreCancha)
      .single();
    canchaId = cancha?.id;
    adminId = cancha?.admin_id;

    // Con una sola cancha, /admin/horarios redirige directo al formulario.
    await page.goto("/admin/horarios");
    await page.waitForURL(new RegExp(`/admin/canchas/${canchaId}/slots/nueva`));

    const fechaISO = fechaEnDias(1);

    await page.getByLabel("Fecha").fill(fechaISO);
    await page.getByLabel("Hora inicio").fill("20:00");
    await page.getByLabel("Hora fin").fill("21:00");
    await page.getByLabel("Precio (₡)").fill("12000");
    await page.getByRole("button", { name: "Crear horario" }).click();

    await expect(page.getByText("Horario creado.")).toBeVisible();

    // Menú "Más" -> salir.
    await page.goto("/admin/mas");
    await page.getByRole("list").getByRole("link", { name: "Canchas" }).click();
    await page.waitForURL(/\/admin\/canchas(\/|$)/);
    await page.goto("/admin/mas");
    await page.getByRole("main").getByRole("button", { name: "Salir" }).click();
    await page.waitForURL(/\/login/);
  });
});
