import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Downloads/ (el padre de este proyecto) está lleno de archivos ajenos;
  // fijar la raíz evita que Turbopack intente inferirla subiendo directorios.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
