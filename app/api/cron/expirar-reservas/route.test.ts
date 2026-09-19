import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { crearSupabaseMock } from "@/tests/helpers/supabaseMock";

const mockCreateServiceRoleClient = vi.fn();
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

const { GET } = await import("./route");

function req(authHeader?: string) {
  return new Request("http://localhost/api/cron/expirar-reservas", {
    headers: authHeader ? { authorization: authHeader } : {},
  }) as never;
}

const ORIGINAL_ENV = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.CRON_SECRET = "el-secreto";
});

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe("GET /api/cron/expirar-reservas", () => {
  test("CRON_SECRET no configurado -> 401, incluso con header 'Bearer undefined'", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer undefined"));
    expect(res.status).toBe(401);
  });

  test("sin header de autorización -> 401", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  test("secret incorrecto -> 401", async () => {
    const res = await GET(req("Bearer secreto-equivocado"));
    expect(res.status).toBe(401);
  });

  test("secret correcto pero el RPC falla -> 500", async () => {
    mockCreateServiceRoleClient.mockReturnValue(
      crearSupabaseMock({ rpc: { data: null, error: { message: "función no existe" } } })
    );
    const res = await GET(req("Bearer el-secreto"));
    expect(res.status).toBe(500);
  });

  test("secret correcto -> 200 y llama al RPC expirar_reservas_vencidas", async () => {
    const supabase = crearSupabaseMock({ rpc: { data: null, error: null } });
    mockCreateServiceRoleClient.mockReturnValue(supabase);
    const res = await GET(req("Bearer el-secreto"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith("expirar_reservas_vencidas");
  });
});
