import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { StepTransferencia } from "@/components/reservas/StepTransferencia";

import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import type { State } from "@/lib/reservation/reducer";

// Las tres props que declara el componente: state, settings y onPending.
const STATE: State = {
  step: 3, checkIn: new Date(2026, 6, 2), checkOut: new Date(2026, 6, 5), guests: 2,
  unitId: "aratiri", firstName: "Juan", lastName: "Pérez", email: "juan@test.com", phone: "+54",
};

function renderStep() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <StepTransferencia state={STATE} settings={DEFAULT_RATE_SETTINGS} onPending={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("selector de comprobante", () => {
  it("el input nativo está oculto pero sigue en el tab order", () => {
    // display:none lo sacaría del foco por teclado: quien navega sin mouse se
    // queda sin poder adjuntar.
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.style.display).not.toBe("none");
    expect(screen.getByText(/Elegir archivo/)).toBeInTheDocument();
  });

  it("rechaza un formato no admitido antes de subirlo", async () => {
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // El atributo accept del input es solo una sugerencia del selector del SO
    // (muchos exponen igual "Todos los archivos"), así que un archivo con un
    // tipo no admitido puede llegar al onChange igual: por eso la validación
    // cliente tiene que atraparlo ella misma. userEvent, por defecto, emula el
    // filtro de accept del navegador y ni siquiera dispara el evento con un
    // tipo no admitido; applyAccept: false lo desactiva para poder probar esa
    // segunda línea de defensa.
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(input, new File(["x"], "a.gif", { type: "image/gif" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/formato no se admite/i);
  });

  it("al elegir un archivo válido muestra su nombre y ofrece cambiarlo", async () => {
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "comprobante.pdf", { type: "application/pdf" }));
    expect(screen.getByText("comprobante.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Cambiar archivo/)).toBeInTheDocument();
  });
});
