import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

// Wrapper controlado: ConfirmDialog no tiene estado propio (open/onOpenChange
// son props), así que el test lo maneja como lo haría un consumidor real —
// esto es lo que permite probar que Escape/backdrop realmente cierran.
function ConfirmDialogControlado({
  onConfirmar,
  cargando = false,
}: {
  onConfirmar: () => void;
  cargando?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      titulo="¿Cancelar esta reserva?"
      descripcion="El horario se libera y otra persona podrá reservarlo."
      textoConfirmar="Sí, cancelar"
      textoCancelar="No, volver"
      cargando={cargando}
      onConfirmar={onConfirmar}
    />
  );
}

describe("ConfirmDialog", () => {
  test("cerrado no muestra el contenido", () => {
    render(<ConfirmDialog open={false} onOpenChange={() => {}} titulo="Título" onConfirmar={() => {}} />);
    expect(screen.queryByText("Título")).not.toBeInTheDocument();
  });

  test("abierto muestra título y descripción", () => {
    render(<ConfirmDialogControlado onConfirmar={() => {}} />);
    expect(screen.getByText("¿Cancelar esta reserva?")).toBeInTheDocument();
    expect(screen.getByText("El horario se libera y otra persona podrá reservarlo.")).toBeInTheDocument();
  });

  test("confirmar llama a onConfirmar", async () => {
    const user = userEvent.setup();
    const onConfirmar = vi.fn();
    render(<ConfirmDialogControlado onConfirmar={onConfirmar} />);

    await user.click(screen.getByRole("button", { name: "Sí, cancelar" }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  test("cargando deshabilita el botón de confirmar y cambia su texto", () => {
    render(<ConfirmDialogControlado onConfirmar={() => {}} cargando />);
    const boton = screen.getByRole("button", { name: "…" });
    expect(boton).toBeDisabled();
  });

  test("Escape cierra el diálogo", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogControlado onConfirmar={() => {}} />);
    expect(screen.getByText("¿Cancelar esta reserva?")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("¿Cancelar esta reserva?")).not.toBeInTheDocument());
  });

  test("el botón 'volver' cierra el diálogo sin confirmar", async () => {
    const user = userEvent.setup();
    const onConfirmar = vi.fn();
    render(<ConfirmDialogControlado onConfirmar={onConfirmar} />);

    await user.click(screen.getByRole("button", { name: "No, volver" }));
    await waitFor(() => expect(screen.queryByText("¿Cancelar esta reserva?")).not.toBeInTheDocument());
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
