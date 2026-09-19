import { describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import { crearSupabaseMock } from "@/tests/helpers/supabaseMock";

const mockCreateClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

const { POST } = await import("./route");

function req(body?: unknown) {
  // La ruta solo usa `request.json()` y `params` — un Request estándar
  // alcanza en runtime; se castea solo para el tipo.
  return new Request("http://localhost/api/reservas/reserva-1/rechazar", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;
}

function params(id = "reserva-1") {
  return { params: Promise.resolve({ id }) };
}

function mockOwnerReserva(estado: "pendiente_validacion" | "creada" = "pendiente_validacion") {
  return crearSupabaseMock({
    usuario: { id: "admin-dueño" },
    tablas: {
      reservas: [{ data: { estado, slot_id: "slot-1" } }, { data: null, error: null }],
      slots: [{ data: { cancha_id: "cancha-1" } }],
      canchas: [{ data: { admin_id: "admin-dueño" } }],
    },
  });
}

describe("POST /api/reservas/[id]/rechazar", () => {
  test("sin autenticación -> 401", async () => {
    mockCreateClient.mockReturnValue(crearSupabaseMock({ usuario: null }));
    const res = await POST(req({ motivo: "no se lee el monto" }), params());
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
    const res = await POST(req({ motivo: "no se lee el monto" }), params());
    expect(res.status).toBe(403);
  });

  test("reserva que no está pendiente_validacion -> 409", async () => {
    mockCreateClient.mockReturnValue(mockOwnerReserva("creada"));
    const res = await POST(req({ motivo: "no se lee el monto" }), params());
    expect(res.status).toBe(409);
  });

  test("sin motivo -> 400", async () => {
    mockCreateClient.mockReturnValue(mockOwnerReserva());
    const res = await POST(req({ motivo: "" }), params());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/motivo de rechazo es requerido/);
  });

  test("motivo en blanco (solo espacios) -> 400", async () => {
    mockCreateClient.mockReturnValue(mockOwnerReserva());
    const res = await POST(req({ motivo: "   " }), params());
    expect(res.status).toBe(400);
  });

  test("body no-JSON no rompe la ruta -> 400 por falta de motivo", async () => {
    mockCreateClient.mockReturnValue(mockOwnerReserva());
    const res = await POST(req(undefined), params());
    expect(res.status).toBe(400);
  });

  test("admin dueño rechaza con motivo -> 200", async () => {
    mockCreateClient.mockReturnValue(mockOwnerReserva());
    const res = await POST(req({ motivo: "El comprobante no coincide con el monto." }), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
