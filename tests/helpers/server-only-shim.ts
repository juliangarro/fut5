// "server-only" (usado por varios módulos de lib/) lanza si se importa
// fuera del bundler de Next.js — irrelevante en Vitest, así que se alías a
// este no-op (ver vitest.config.ts, resolve.alias).
export {};
