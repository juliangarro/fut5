import { act } from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservaEstado } from "./ReservaEstado";
import { toast } from "sonner";

const { realtimeState, mockRefresh } = vi.hoisted(() => ({
  realtimeState: { cb: null as null | ((payload: { new: unknown }) => void) },
  mockRefresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    channel: () => ({
      on: (_evento: string, _filtro: unknown, cb: (payload: { new: unknown }) => void) => {
        realtimeState.cb = cb;
        return { subscribe: () => ({}) };
      },
    }),
    removeChannel: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

function reservaBase(overrides: Partial<Parameters<typeof ReservaEstado>[0]["reservaInicial"]> = {}) {
  return {
    id: "reserva-1",
    estado: "creada" as const,
    monto: 10000,
    motivo_rechazo: null,
    expira_at: null,
    comprobante_subido_at: null,
    modo_cobro: "individual" as const,
    token_cobro: null,
    cantidad_aportes: null,
    ...overrides,
  };
}

function renderReservaEstado(props: Partial<Parameters<typeof ReservaEstado>[0]> = {}) {
  const onCancelar = props.onCancelar ?? vi.fn();
  return {
    onCancelar,
    ...render(
      <ReservaEstado
        reservaInicial={reservaBase()}
        comprobanteUrl={null}
        cancha={{ nombre: "Cancha Test", numero_sinpe: "88888888", foto: null }}
        slot={{ fecha: "2026-09-20", hora_inicio: "18:00:00", hora_fin: "19:00:00" }}
        onCancelar={onCancelar}
        aportesIniciales={[]}
        origenSitio="https://example.com"
        cobroGrupalHabilitado={false}
        {...props}
      />
    ),
  };
}

beforeEach(() => {
  realtimeState.cb = null;
  vi.clearAllMocks();
});

describe("ReservaEstado", () => {
  test("cancelación exitosa cierra el diálogo de confirmación", async () => {
    const user = userEvent.setup();
    const onCancelar = vi.fn().mockResolvedValue(undefined);
    renderReservaEstado({ onCancelar });

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    expect(screen.getByText("¿Cancelar esta reserva?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    await waitFor(() => expect(onCancelar).toHaveBeenCalledWith("reserva-1"));
    await waitFor(() => expect(screen.queryByText("¿Cancelar esta reserva?")).not.toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Regresión de esta sesión: antes, un rechazo de la Server Action (ej. el
  // estado ya cambió por otro lado mientras el diálogo estaba abierto)
  // quedaba como promesa sin manejar — sin toast, sin cerrar el diálogo.
  test("cancelación fallida muestra un toast de error y no deja la promesa sin manejar", async () => {
    const user = userEvent.setup();
    const onCancelar = vi.fn().mockRejectedValue(new Error("La reserva ya no está en creada."));
    renderReservaEstado({ onCancelar });

    await user.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await user.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("La reserva ya no está en creada."));
    await waitFor(() => expect(screen.queryByText("¿Cancelar esta reserva?")).not.toBeInTheDocument());
    expect(mockRefresh).toHaveBeenCalled();
  });

  test("una actualización realtime cambia el estado mostrado", async () => {
    renderReservaEstado();
    expect(screen.getByText("Esperando pago")).toBeInTheDocument();

    // El componente espera a auth.getSession() (una promesa) antes de
    // suscribirse — hay que dejar que ese microtask corra antes de que
    // realtimeState.cb quede seteado.
    await waitFor(() => expect(realtimeState.cb).not.toBeNull());

    act(() => {
      realtimeState.cb?.({ new: { ...reservaBase(), estado: "confirmada" } });
    });

    await waitFor(() => expect(screen.getByText("Confirmada")).toBeInTheDocument());
    expect(toast.info).toHaveBeenCalledWith("Tu reserva pasó a: Confirmada");
  });
});
