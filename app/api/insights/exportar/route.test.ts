import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { crearSupabaseMock } from "@/tests/helpers/supabaseMock";

const mockCreateClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

const { GET } = await import("./route");

function req(periodo?: string) {
  const url = periodo
    ? `http://localhost/api/insights/exportar?periodo=${periodo}`
    : "http://localhost/api/insights/exportar";
  return new NextRequest(url);
}

describe("GET /api/insights/exportar", () => {
  test("sin autenticación -> 401", async () => {
    mockCreateClient.mockReturnValue(crearSupabaseMock({ usuario: null }));
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  test("admin sin canchas -> CSV con solo el encabezado", async () => {
    mockCreateClient.mockReturnValue(
      crearSupabaseMock({ usuario: { id: "admin-1" }, tablas: { canchas: [{ data: [] }] } })
    );
    const res = await GET(req());
    expect(res.headers.get("Content-Type")).toMatch(/text\/csv/);
    expect(await res.text()).toBe("cancha,fecha,hora,futbolero,estado,monto\n");
  });

  test("escapa nombres con coma y neutraliza inyección de fórmula (=, +, -, @)", async () => {
    mockCreateClient.mockReturnValue(
      crearSupabaseMock({
        usuario: { id: "admin-1" },
        tablas: {
          // Nombre de cancha que empieza con '=' — CSV/formula injection si
          // se abre en Excel/Sheets sin neutralizar (ver csvEscape en route.ts).
          canchas: [{ data: [{ id: "cancha-1", nombre: "=SUM(A1:A9)" }] }],
          slots: [{ data: [{ id: "slot-1", fecha: "2026-09-18", hora_inicio: "18:00:00", cancha_id: "cancha-1" }] }],
          reservas: [{ data: [{ futbolero_id: "futbolero-1", estado: "confirmada", monto: 10000, slot_id: "slot-1" }] }],
          usuarios: [{ data: [{ id: "futbolero-1", nombre: "Pérez, Juan" }] }],
        },
      })
    );
    const res = await GET(req());
    const csv = await res.text();
    const filas = csv.split("\n");
    expect(filas[0]).toBe("cancha,fecha,hora,futbolero,estado,monto");
    // La fórmula queda prefijada con comilla simple (el campo en sí no tiene
    // coma/comilla, así que no se envuelve entre comillas); el campo con
    // coma sí va entre comillas.
    expect(filas[1]).toBe('\'=SUM(A1:A9),2026-09-18,18:00,"Pérez, Juan",confirmada,10000');
  });

  // Content-Disposition solo se manda en el camino con canchas — el atajo
  // "sin canchas" (arriba) devuelve un CSV mínimo sin ese header.
  function mockConCanchaSinReservas() {
    return crearSupabaseMock({
      usuario: { id: "admin-1" },
      tablas: {
        canchas: [{ data: [{ id: "cancha-1", nombre: "Cancha Test" }] }],
        slots: [{ data: [] }],
      },
    });
  }

  test("respeta el parámetro periodo y cae a 30 días si viene inválido", async () => {
    mockCreateClient.mockReturnValue(mockConCanchaSinReservas());
    const res = await GET(req("periodo-invalido"));
    expect(res.headers.get("Content-Disposition")).toMatch(/reservas_.*\.csv/);
  });

  test("el nombre del archivo en Content-Disposition usa el rango del período", async () => {
    mockCreateClient.mockReturnValue(mockConCanchaSinReservas());
    const res = await GET(req("7"));
    expect(res.headers.get("Content-Disposition")).toContain("attachment;");
    expect(res.headers.get("Content-Disposition")).toMatch(/filename="reservas_\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.csv"/);
  });
});
