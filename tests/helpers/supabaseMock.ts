import { vi } from "vitest";

type Resultado = { data: unknown; error?: unknown; count?: number | null };

/**
 * Builder encadenable que imita `supabase.from(tabla).select().eq()...`:
 * cada método de filtro devuelve `this`, y el builder es "thenable" —
 * awaitearlo (como hace el código real, sin `.single()`) resuelve al
 * resultado configurado. `.single()`/`.maybeSingle()` también resuelven
 * directo, igual que el cliente real.
 */
function crearQueryBuilder(resultado: Resultado) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(resultado)),
    maybeSingle: vi.fn(() => Promise.resolve(resultado)),
    then: (resolve: (v: Resultado) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(resultado).then(resolve, reject),
  };
  return builder;
}

/**
 * Mock mínimo de un SupabaseClient para rutas y funciones de `lib/` que solo
 * usan `.from(tabla)...`, `.auth.getUser()`, `.storage.from(bucket)...` y
 * `.rpc(...)`. `tablas[nombre]` es una cola de resultados: cada consulta
 * sucesiva a esa tabla consume el siguiente resultado de la cola (el último
 * se repite si se consulta más veces de las que hay en cola) — así se puede
 * simular la misma tabla devolviendo cosas distintas en llamadas
 * consecutivas (ej. `_ownership.ts`, que no aplica acá porque usa tablas
 * distintas, pero sí hace falta en otras rutas).
 */
export function crearSupabaseMock(opciones: {
  usuario?: { id: string } | null;
  tablas?: Record<string, Resultado[]>;
  storage?: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  rpc?: Resultado;
}) {
  const colas = new Map<string, Resultado[]>();
  for (const [tabla, resultados] of Object.entries(opciones.tablas ?? {})) {
    colas.set(tabla, [...resultados]);
  }

  const from = vi.fn((tabla: string) => {
    const cola = colas.get(tabla);
    const resultado: Resultado = cola && cola.length > 1 ? cola.shift()! : (cola?.[0] ?? { data: null, error: null });
    return crearQueryBuilder(resultado);
  });

  return {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: opciones.usuario ?? null }, error: null })),
    },
    from,
    rpc: vi.fn(() => Promise.resolve(opciones.rpc ?? { data: null, error: null })),
    storage: {
      from: vi.fn(
        (bucket: string) =>
          opciones.storage?.[bucket] ?? {
            upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
            remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
          }
      ),
    },
  };
}
