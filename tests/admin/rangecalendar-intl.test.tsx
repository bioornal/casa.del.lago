import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { RangeCalendar } from "@/components/reservas/RangeCalendar";

// Regresión: /admin es un root layout aparte y NO hereda el
// NextIntlClientProvider de [locale]. RangeCalendar se comparte entre el sitio
// público y el panel (ManualReservationForm), y llama a useLocale(); sin
// provider tira "No intl context found" y la pantalla de reservas del panel no
// carga. Estas pruebas fijan ese contrato para que no se vuelva a caer si
// alguien saca el provider de app/admin/layout.tsx.

const VACIO = { checkIn: null, checkOut: null };

afterEach(cleanup);

describe("RangeCalendar y el contexto de next-intl", () => {
  it("no puede renderizar sin provider: necesita useLocale()", () => {
    // React escribe el error en consola aunque el test lo capture.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<RangeCalendar value={VACIO} onChange={() => {}} />)).toThrow(
      /No intl context found/,
    );
    spy.mockRestore();
  });

  it("dentro del provider en español renderiza el almanaque localizado", () => {
    render(
      <NextIntlClientProvider locale="es">
        <RangeCalendar value={VACIO} onChange={() => {}} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // El mes viene de date-fns con el locale que devuelve useLocale().
    const mesEnEspañol = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i;
    expect(screen.getByText(mesEnEspañol)).toBeInTheDocument();
  });
});
