import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // "server-only" lanza si se importa fuera del bundler de Next — no
      // aplica en Vitest. Ver tests/helpers/server-only-shim.ts.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-shim.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
