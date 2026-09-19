import { describe, expect, test } from "vitest";
import { contarPendientes } from "./contarPendientes";
import { crearSupabaseMock } from "@/tests/helpers/supabaseMock";

describe("contarPendientes", () => {
  test("admin sin canchas -> 0 sin consultar nada más", async () => {
    const supabase = crearSupabaseMock({ tablas: { canchas: [{ data: [] }] } });
    const resultado = await contarPendientes(supabase as never, "admin-1");
    expect(resultado).toEqual({ total: 0, expiraMasProxima: null });
  });

  test("admin con canchas pero sin slots cargados -> 0", async () => {
    const supabase = crearSupabaseMock({
      tablas: {
        canchas: [{ data: [{ id: "cancha-1" }] }],
        slots: [{ data: [] }],
      },
    });
    const resultado = await contarPendientes(supabase as never, "admin-1");
    expect(resultado).toEqual({ total: 0, expiraMasProxima: null });
  });

  test("cuenta las pendientes y devuelve la expiración más próxima", async () => {
    const supabase = crearSupabaseMock({
      tablas: {
        canchas: [{ data: [{ id: "cancha-1" }] }],
        slots: [{ data: [{ id: "slot-1" }, { id: "slot-2" }] }],
        reservas: [{ data: [{ expira_at: "2026-09-18T20:00:00Z" }], count: 3 }],
      },
    });
    const resultado = await contarPendientes(supabase as never, "admin-1");
    expect(resultado).toEqual({ total: 3, expiraMasProxima: "2026-09-18T20:00:00Z" });
  });

  test("sin filas de reserva pendientes -> expiraMasProxima null aunque count sea 0", async () => {
    const supabase = crearSupabaseMock({
      tablas: {
        canchas: [{ data: [{ id: "cancha-1" }] }],
        slots: [{ data: [{ id: "slot-1" }] }],
        reservas: [{ data: [], count: 0 }],
      },
    });
    const resultado = await contarPendientes(supabase as never, "admin-1");
    expect(resultado).toEqual({ total: 0, expiraMasProxima: null });
  });
});
