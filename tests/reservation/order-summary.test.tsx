import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { OrderSummary } from "@/components/reservas/OrderSummary";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import type { State } from "@/lib/reservation/reducer";

// State completo, sin casts: son los nueve campos que declara el reducer.
const STATE: State = {
  step: 2,
  checkIn: new Date(2026, 6, 2),
  checkOut: new Date(2026, 6, 5),
  guests: 2,
  unitId: "aratiri",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54 9 376 000000",
};

function renderCon(method: "card" | "transfer") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <OrderSummary state={STATE} settings={DEFAULT_RATE_SETTINGS} method={method} />
    </NextIntlClientProvider>,
  );
}

describe("OrderSummary", () => {
  it("la limpieza vale lo mismo en las dos pestañas", () => {
    // Era el bug: la MISMA tasa aparecía a dos precios según el método.
    const { unmount } = renderCon("card");
    expect(screen.getByText("$30.000")).toBeInTheDocument();
    unmount();
    renderCon("transfer");
    expect(screen.getByText("$30.000")).toBeInTheDocument();
  });

  it("con transferencia aparece la línea de descuento; con tarjeta no", () => {
    const { unmount } = renderCon("card");
    expect(screen.queryByText(/Descuento por transferencia/)).not.toBeInTheDocument();
    unmount();
    renderCon("transfer");
    expect(screen.getByText(/Descuento por transferencia/)).toBeInTheDocument();
  });
});
