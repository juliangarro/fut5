import { describe, expect, test } from "vitest";
import { verificarPropiedadAdmin } from "./_ownership";
import { crearSupabaseMock } from "@/tests/helpers/supabaseMock";

describe("verificarPropiedadAdmin", () => {
  test("sin usuario autenticado -> 401", async () => {
    const supabase = crearSupabaseMock({ usuario: null });
    const resultado = await verificarPropiedadAdmin(supabase as never, "reserva-1");
    expect(resultado).toEqual({ error: "No autenticado", status: 401 });
  });

  test("reserva inexistente -> 404", async () => {
    const supabase = crearSupabaseMock({
      usuario: { id: "admin-1" },
      tablas: { reservas: [{ data: null }] },
    });
    const resultado = await verificarPropiedadAdmin(supabase as never, "reserva-1");
    expect(resultado).toEqual({ error: "Reserva no encontrada", status: 404 });
  });

  test("slot de la reserva inexistente (dato inconsistente) -> 404", async () => {
    const supabase = crearSupabaseMock({
      usuario: { id: "admin-1" },
      tablas: {
        reservas: [{ data: { estado: "pendiente_validacion", slot_id: "slot-1" } }],
        slots: [{ data: null }],
      },
    });
    const resultado = await verificarPropiedadAdmin(supabase as never, "reserva-1");
    expect(resultado).toEqual({ error: "Reserva no encontrada", status: 404 });
  });

  test("admin autenticado no es dueño de la cancha de esa reserva -> 403", async () => {
    const supabase = crearSupabaseMock({
      usuario: { id: "admin-ajeno" },
      tablas: {
        reservas: [{ data: { estado: "pendiente_validacion", slot_id: "slot-1" } }],
        slots: [{ data: { cancha_id: "cancha-1" } }],
        canchas: [{ data: { admin_id: "admin-dueño" } }],
      },
    });
    const resultado = await verificarPropiedadAdmin(supabase as never, "reserva-1");
    expect(resultado).toEqual({ error: "No autorizado", status: 403 });
  });

  test("admin dueño de la cancha -> devuelve la reserva, sin error", async () => {
    const supabase = crearSupabaseMock({
      usuario: { id: "admin-dueño" },
      tablas: {
        reservas: [{ data: { estado: "pendiente_validacion", slot_id: "slot-1" } }],
        slots: [{ data: { cancha_id: "cancha-1" } }],
        canchas: [{ data: { admin_id: "admin-dueño" } }],
      },
    });
    const resultado = await verificarPropiedadAdmin(supabase as never, "reserva-1");
    expect(resultado).toEqual({ reserva: { estado: "pendiente_validacion", slot_id: "slot-1" } });
  });
});
