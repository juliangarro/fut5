import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComprobanteUploader } from "./ComprobanteUploader";

// La compresión real usa createImageBitmap/canvas, que jsdom no implementa
// — no es lo que este test cubre (eso es un detalle de lib/comprimirImagen),
// así que se mockea como passthrough.
vi.mock("@/lib/comprimirImagen", () => ({
  comprimirImagen: vi.fn(async (file: File) => file),
}));

beforeEach(() => {
  // jsdom no implementa createObjectURL/revokeObjectURL sobre File/Blob.
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function archivoDePrueba() {
  return new File(["contenido"], "comprobante.jpg", { type: "image/jpeg" });
}

async function elegirArchivo(container: HTMLElement) {
  const user = userEvent.setup();
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, archivoDePrueba());
  await waitFor(() => screen.getByRole("button", { name: /Enviar comprobante/i }));
  return user;
}

describe("ComprobanteUploader", () => {
  test("flujo feliz: elegir archivo -> enviar -> enviado", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ComprobanteUploader reservaId="reserva-1" />);
    const user = await elegirArchivo(container);

    await user.click(screen.getByRole("button", { name: /Enviar comprobante/i }));

    await waitFor(() => expect(screen.getByText(/Comprobante enviado/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reservas/reserva-1/comprobante",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("un error 4xx no reintenta y muestra el mensaje del servidor", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: "Formato no soportado. Usá JPG, PNG o WEBP." }), { status: 400 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ComprobanteUploader reservaId="reserva-1" />);
    const user = await elegirArchivo(container);
    await user.click(screen.getByRole("button", { name: /Enviar comprobante/i }));

    await waitFor(() => expect(screen.getByText("Formato no soportado. Usá JPG, PNG o WEBP.")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Reintentar envío/i })).toBeInTheDocument();
  });

  // Regresión: un fallo de red transitorio (fetch rechaza — mismo camino que
  // toma un AbortSignal.timeout al vencer) no debe dejar al usuario con el
  // botón "congelado" en estado de error; el componente reintenta solo y,
  // si el siguiente intento funciona, termina en 'enviado'.
  test(
    "reintenta tras un fallo de red transitorio y termina en éxito",
    async () => {
      let intento = 0;
      const fetchMock = vi.fn(async () => {
        intento += 1;
        if (intento === 1) throw new Error("network error");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const { container } = render(<ComprobanteUploader reservaId="reserva-1" />);
      const user = await elegirArchivo(container);
      await user.click(screen.getByRole("button", { name: /Enviar comprobante/i }));

      await waitFor(() => expect(screen.getByText(/Comprobante enviado/i)).toBeInTheDocument(), {
        timeout: 5000,
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
    10_000
  );

  test("agota los reintentos tras fallos de red persistentes y muestra el error genérico", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network error");
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ComprobanteUploader reservaId="reserva-1" />);
    const user = await elegirArchivo(container);
    await user.click(screen.getByRole("button", { name: /Enviar comprobante/i }));

    await waitFor(
      () => expect(screen.getByText(/No se pudo subir el comprobante\. Revisá tu conexión/i)).toBeInTheDocument(),
      { timeout: 10_000 }
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 15_000);
});
