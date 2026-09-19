// jsdom's Request/FormData/File implementations don't interoperate cleanly
// (a File appended to a jsdom FormData breaks when read back by a jsdom
// Request body) — this route test has no DOM needs, so run it under Node's
// native fetch primitives instead.
// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import { crearSupabaseMock } from "@/tests/helpers/supabaseMock";

const mockCreateClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

const { POST } = await import("./route");

function archivo(opciones: { type?: string; size?: number } = {}) {
  const bytes = new Uint8Array(opciones.size ?? 10);
  return new File([bytes], "comprobante.jpg", { type: opciones.type ?? "image/jpeg" });
}

function req(file?: File | null) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  // La ruta solo usa `request.formData()` y `params` — un Request estándar
  // alcanza en runtime; se castea solo para el tipo.
  return new Request("http://localhost/api/reservas/reserva-1/comprobante", {
    method: "POST",
    body: formData,
  }) as unknown as NextRequest;
}

function params(id = "reserva-1") {
  return { params: Promise.resolve({ id }) };
}

function mockConReserva(overrides: { futbolero_id?: string; estado?: string } = {}) {
  const upload = vi.fn(() => Promise.resolve({ data: { path: "x" }, error: null }));
  const remove = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const supabase = crearSupabaseMock({
    usuario: { id: "futbolero-1" },
    tablas: {
      reservas: [
        { data: { id: "reserva-1", futbolero_id: overrides.futbolero_id ?? "futbolero-1", estado: overrides.estado ?? "creada" } },
        { data: null, error: null },
      ],
    },
    storage: { comprobantes: { upload, remove } },
  });
  return { supabase, upload, remove };
}

describe("POST /api/reservas/[id]/comprobante", () => {
  test("sin autenticación -> 401", async () => {
    mockCreateClient.mockReturnValue(crearSupabaseMock({ usuario: null }));
    const res = await POST(req(archivo()), params());
    expect(res.status).toBe(401);
  });

  test("reserva inexistente -> 404", async () => {
    mockCreateClient.mockReturnValue(
      crearSupabaseMock({ usuario: { id: "futbolero-1" }, tablas: { reservas: [{ data: null, error: { message: "not found" } }] } })
    );
    const res = await POST(req(archivo()), params());
    expect(res.status).toBe(404);
  });

  test("la reserva no es del futbolero autenticado -> 403", async () => {
    const { supabase } = mockConReserva({ futbolero_id: "otro-futbolero" });
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(archivo()), params());
    expect(res.status).toBe(403);
  });

  test("la reserva ya no está en creada -> 409", async () => {
    const { supabase } = mockConReserva({ estado: "pendiente_validacion" });
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(archivo()), params());
    expect(res.status).toBe(409);
  });

  test("sin archivo -> 400", async () => {
    const { supabase } = mockConReserva();
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(null), params());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Archivo requerido");
  });

  test("formato no soportado (pdf) -> 400", async () => {
    const { supabase } = mockConReserva();
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(archivo({ type: "application/pdf" })), params());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Formato no soportado/);
  });

  test("archivo supera los 5MB -> 400", async () => {
    const { supabase } = mockConReserva();
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(archivo({ size: 5 * 1024 * 1024 + 1 })), params());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/5MB/);
  });

  test("falla la subida a storage -> 502", async () => {
    const { supabase } = mockConReserva();
    supabase.storage.from("comprobantes").upload = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "bucket lleno" } })
    );
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(archivo()), params());
    expect(res.status).toBe(502);
  });

  test("falla el UPDATE tras subir -> 500 y limpia el archivo subido (storage.remove)", async () => {
    const upload = vi.fn(() => Promise.resolve({ data: { path: "x" }, error: null }));
    const remove = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const supabase = crearSupabaseMock({
      usuario: { id: "futbolero-1" },
      tablas: {
        reservas: [
          { data: { id: "reserva-1", futbolero_id: "futbolero-1", estado: "creada" } },
          { data: null, error: { message: "conexión perdida" } },
        ],
      },
      storage: { comprobantes: { upload, remove } },
    });
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(archivo()), params());
    expect(res.status).toBe(500);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test("subida y actualización exitosas -> 200", async () => {
    const { supabase } = mockConReserva();
    mockCreateClient.mockReturnValue(supabase);
    const res = await POST(req(archivo()), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
