import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { OrderSummary } from "@/components/reservas/OrderSummary";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { priceBreakdown, methodTotal } from "@/lib/reservation/method-pricing";
import { computeNights } from "@/lib/reservation/pricing";
import type { State } from "@/lib/reservation/reducer";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

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

  it("el Total en pantalla es methodTotal (no listTotal), la línea de alojamiento está, y el precio por noche es el mismo string en las dos pestañas", () => {
    // Guardrail del cableado: si OrderSummary mostrara money(bd.listTotal) en
    // vez de money(bd.total), en la pestaña de transferencia se vería un
    // precio y se cobraría otro (bd.total viene de methodTotal, que es lo que
    // recalculan /api/payments y /api/reservations/transfer). Este test debe
    // fallar si alguien hace ese cambio.
    const nights = computeNights(STATE.checkIn, STATE.checkOut);
    const cardBd = priceBreakdown(DEFAULT_RATE_SETTINGS, "card", STATE.unitId, nights);

    for (const method of ["card", "transfer"] as const) {
      const bd = priceBreakdown(DEFAULT_RATE_SETTINGS, method, STATE.unitId, nights);
      // Con transferencia, total y listTotal DIFIEREN (hay descuento): si esta
      // comparación colapsara (mismo valor), el test de abajo no blindaría nada.
      if (method === "transfer") expect(bd.total).not.toBe(bd.listTotal);

      const { unmount } = renderCon(method);

      // Total mostrado === methodTotal, no listTotal.
      expect(bd.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, method, STATE.unitId, nights));
      const totalLabel = screen.getByText("Total");
      expect(totalLabel.nextElementSibling).toHaveTextContent(money(bd.total));

      // La línea de alojamiento (precio de lista por noche × noches) está.
      const lodgingLine = screen.getByText(
        (_, node) => node?.textContent === `${money(bd.nightly)} × ${nights}`,
      );
      expect(lodgingLine).toBeInTheDocument();

      // El precio por noche mostrado es el mismo string en las dos pestañas:
      // es el titular del dominio, el precio de lista no cambia con el método.
      expect(lodgingLine.textContent).toBe(`${money(cardBd.nightly)} × ${nights}`);

      unmount();
    }
  });
});
