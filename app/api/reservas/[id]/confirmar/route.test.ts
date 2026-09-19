import { describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import { crearSupabaseMock } from "@/tests/helpers/supabaseMock";

const mockCreateClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

const { POST } = await import("./route");

function req() {
  // La ruta solo usa `params` — nunca toca nada específico de NextRequest —
  // así que un Request estándar alcanza en runtime; se castea solo para el tipo.
  return new Request("http://localhost/api/reservas/reserva-1/confirmar", { method: "POST" }) as unknown as NextRequest;
}

function params(id = "reserva-1") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/reservas/[id]/confirmar", () => {
  test("sin autenticación -> 401", async () => {
    mockCreateClient.mockReturnValue(crearSupabaseMock({ usuario: null }));
    const res = await POST(req(), params());
    expect(res.status).toBe(401);
  });

  test("admin que no es dueño de la cancha -> 403", async () => {
    mockCreateClient.mockReturnValue(
      crearSupabaseMock({
        usuario: { id: "admin-ajeno" },
        tablas: {
          reservas: [{ data: { estado: "pendiente_validacion", slot_id: "slot-1" } }],
          slots: [{ data: { cancha_id: "cancha-1" } }],
          canchas: [{ data: { admin_id: "admin-dueño" } }],
        },
      })
    );
    const res = await POST(req(), params());
    expect(res.status).toBe(403);
  });

  test("reserva que no está pendiente_validacion -> 409", async () => {
    mockCreateClient.mockReturnValue(
      crearSupabaseMock({
        usuario: { id: "admin-dueño" },
        tablas: {
          reservas: [{ data: { estado: "creada", slot_id: "slot-1" } }],
          slots: [{ data: { cancha_id: "cancha-1" } }],
          canchas: [{ data: { admin_id: "admin-dueño" } }],
        },
      })
    );
    const res = await POST(req(), params());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/no está pendiente de validación/);
  });

  test("falla el UPDATE en base -> 500 con el mensaje de error", async () => {
    mockCreateClient.mockReturnValue(
      crearSupabaseMock({
        usuario: { id: "admin-dueño" },
        tablas: {
          reservas: [
            { data: { estado: "pendiente_validacion", slot_id: "slot-1" } },
            { data: null, error: { message: "conexión perdida" } },
          ],
          slots: [{ data: { cancha_id: "cancha-1" } }],
          canchas: [{ data: { admin_id: "admin-dueño" } }],
        },
      })
    );
    const res = await POST(req(), params());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("conexión perdida");
  });

  test("admin dueño confirma una reserva pendiente_validacion -> 200", async () => {
    mockCreateClient.mockReturnValue(
      crearSupabaseMock({
        usuario: { id: "admin-dueño" },
        tablas: {
          reservas: [
            { data: { estado: "pendiente_validacion", slot_id: "slot-1" } },
            { data: null, error: null },
          ],
          slots: [{ data: { cancha_id: "cancha-1" } }],
          canchas: [{ data: { admin_id: "admin-dueño" } }],
        },
      })
    );
    const res = await POST(req(), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
