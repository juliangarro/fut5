import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// El servidor de producción corre en UTC (ver lib/fecha.ts) — fijar acá
// evita que lib/insights.ts:rangoPeriodo (que mezcla setHours/setDate en
// hora local con toISOString() en UTC) dé resultados distintos según la
// zona horaria de quien corre los tests.
process.env.TZ = "UTC";

// React Testing Library auto-registra este cleanup detectando un `afterEach`
// global — no aplica acá porque `test.globals` está desactivado (los tests
// importan describe/test/expect de "vitest" explícitamente), así que hay
// que registrarlo a mano. Sin esto, cada test deja su render montado y el
// siguiente test del mismo archivo encuentra elementos duplicados.
afterEach(() => {
  cleanup();
});
