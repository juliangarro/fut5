import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Downloads/ (el padre de este proyecto) está lleno de archivos ajenos;
  // fijar la raíz evita que Turbopack intente inferirla subiendo directorios.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Los tests E2E (Playwright, ver playwright.config.ts) corren next dev en
  // 127.0.0.1 en vez de localhost. Sin esto, Next bloquea el WebSocket de
  // HMR por cross-origin y el cliente de Turbopack reintenta con reloads
  // completos de página — lo que resetea cualquier estado de componente
  // (ej. la pestaña de día seleccionada en SlotPicker) justo después de
  // interactuar con él, haciendo que los tests fallen de forma confusa.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
