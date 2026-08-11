import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { StepTransferencia } from "@/components/reservas/StepTransferencia";

import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { MAX_BYTES } from "@/lib/reservation/comprobante";
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
  it("el input de archivo sigue siendo alcanzable por teclado y tiene un label asociado", async () => {
    // `style.display !== "none"` no protege nada: display:none, visibility:hidden,
    // el atributo hidden y tabIndex={-1} sacan igual un elemento del tab order
    // sin que ese chequeo puntual lo note. Lo que importa de verdad es el
    // resultado — que Tab lo enfoque y que tenga un label — no un valor de estilo.
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    await userEvent.tab();
    expect(document.activeElement).toBe(input);

    const label = document.querySelector(`label[for="${input.id}"]`);
    expect(label).toBeTruthy();
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

  it("rechaza un archivo que supera el máximo e interpola el tamaño en el mensaje", async () => {
    // transferFileTooBig es la única clave de mensajes que interpola {size}
    // (ver messages/es.json): si el placeholder de next-intl estuviera mal
    // escrito o desalineado con lo que pasa StepTransferencia, esto revienta
    // en runtime en vez de solo fallar un test.
    renderStep();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const big = new File([new Uint8Array(MAX_BYTES + 1)], "grande.jpg", { type: "image/jpeg" });
    await userEvent.upload(input, big);
    expect(screen.getByRole("alert")).toHaveTextContent(/6\.1 MB/);
    expect(screen.getByRole("alert")).toHaveTextContent(/6 MB/);
  });
});
