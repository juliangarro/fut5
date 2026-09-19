import { defineConfig, devices } from "@playwright/test";

// CRÍTICO (ver TESTING.md sección 0): el único proyecto Supabase es
// producción — `.env.local` apunta a él. Estos valores son los que imprime
// `supabase start` para la base LOCAL (siempre los mismos, son de
// desarrollo público — no son un secreto de este proyecto). Se pasan acá
// como `env` del webServer para que sobreescriban a `.env.local`: Next.js
// (vía `@next/env`/dotenv) nunca pisa una variable que ya esté seteada en
// `process.env` del proceso, así que estos valores ganan sin tener que
// tocar `.env.local`. Nunca correr E2E sin este archivo, y nunca cambiar
// estas URLs a nada que no sea 127.0.0.1.
const SUPABASE_LOCAL_URL = "http://127.0.0.1:54321";
const SUPABASE_LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const E2E_CRON_SECRET = "e2e-test-cron-secret";
const PORT = 3100;

// Los helpers de seed/limpieza (e2e/helpers/db.ts) corren en este mismo
// proceso de Playwright, no dentro de `next dev` — necesitan estas mismas
// variables en su propio `process.env`, no solo en el `webServer.env` de
// abajo (que solo aplica al proceso hijo de Next).
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_LOCAL_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_LOCAL_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_LOCAL_SERVICE_ROLE_KEY;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_LOCAL_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_LOCAL_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_LOCAL_SERVICE_ROLE_KEY,
      CRON_SECRET: E2E_CRON_SECRET,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

export { SUPABASE_LOCAL_URL, SUPABASE_LOCAL_SERVICE_ROLE_KEY };
