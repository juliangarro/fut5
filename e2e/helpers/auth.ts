import type { Page } from "@playwright/test";

// El login real (email/password) está deshabilitado temporalmente — ver
// DECISIONS.md y app/login/actions.ts. El flujo activo (`entrar`) solo pide
// email + rol y loguea al instante, sin correo de verdad — no hace falta
// Mailpit ni leer un magic link para automatizar esto.
export async function loginComo(page: Page, email: string, rol: "futbolero" | "admin_cancha") {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  // El radio de base-ui es un <span role="radio"> sin nombre accesible
  // propio (no es un elemento "labelable" nativo, así que envolverlo en
  // <label> no le hereda el texto) — hay que apuntarle directo, escopeado
  // por el texto de su tarjeta.
  await page
    .locator("label", { hasText: rol === "futbolero" ? "Quiero jugar" : "Tengo una cancha" })
    .locator('[role="radio"]')
    .click();
  await page.getByRole("button", { name: "Entrar" }).click();
  // "/futbolero" redirige del lado del servidor a "/futbolero/canchas"
  // (y "/admin" probablemente a una subruta similar) — el glob "**/futbolero"
  // nunca matchea porque la URL final no termina ahí.
  await page.waitForURL(rol === "futbolero" ? /\/futbolero(\/|$)/ : /\/admin(\/|$)/);
}
