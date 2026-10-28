import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { OrderSummary } from "@/components/reservas/OrderSummary";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { priceBreakdown } from "@/lib/reservation/method-pricing";
import { computeNights } from "@/lib/reservation/pricing";
import type { State } from "@/lib/reservation/reducer";
import type { UnitSlug } from "@/lib/units";
import { TEST_UNIT_ID, checkoutTotal } from "@/lib/reservation/test-unit";

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

// priceBreakdown sigue siendo solo para unidades reales (Task 2): estos tests
// la ejercitan directamente, no a través de OrderSummary, así que necesitan el
// tipo angosto aunque STATE.unitId ahora sea BookableUnitId.
const REAL_UNIT_ID = STATE.unitId as UnitSlug;

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
    const cardBd = priceBreakdown(DEFAULT_RATE_SETTINGS, "card", REAL_UNIT_ID, nights);

    for (const method of ["card", "transfer"] as const) {
      const bd = priceBreakdown(DEFAULT_RATE_SETTINGS, method, REAL_UNIT_ID, nights);
      // Con transferencia, total y listTotal DIFIEREN (hay descuento): si esta
      // comparación colapsara (mismo valor), el test de abajo no blindaría nada.
      if (method === "transfer") expect(bd.total).not.toBe(bd.listTotal);

      const { unmount } = renderCon(method);

      // Total mostrado === checkoutTotal (methodTotal para una unidad real,
      // nunca listTotal).
      expect(bd.total).toBe(checkoutTotal(DEFAULT_RATE_SETTINGS, method, STATE.unitId, nights));
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

  it("con una unidad real el desglose es el mismo de siempre", () => {
    // La unidad de prueba no puede alterar lo que ve un huésped real: es la
    // condición de toda esta task.
    renderCon("card");
    expect(screen.getByText("$30.000")).toBeInTheDocument();
    expect(screen.queryByText(/Estadía de prueba/)).not.toBeInTheDocument();
  });

  it("con la unidad de prueba muestra el precio plano, el Total, y ningún desglose", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <OrderSummary state={{ ...STATE, unitId: TEST_UNIT_ID }} settings={DEFAULT_RATE_SETTINGS} method="card" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/Estadía de prueba/)).toBeInTheDocument();

    // El Total se ubica por su etiqueta y se lee el nodo hermano (como en el
    // caso de arriba): con precio plano la fila "Estadía de prueba" y el Total
    // muestran la MISMA cifra a propósito (es la fidelidad con el checkout
    // real lo que importa acá, no que el importe sea único en pantalla).
    const totalLabel = screen.getByText("Total");
    expect(totalLabel.nextElementSibling).toHaveTextContent("$2.500");

    // Sin desglose por noche ni limpieza: es precio plano, no hay nada que prorratear.
    expect(screen.queryByText("Limpieza")).not.toBeInTheDocument();
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    expect(screen.queryByText("$30.000")).not.toBeInTheDocument();
  });
});

describe("OrderSummary con temporada alta", () => {
  const WITH_HIGH = {
    ...DEFAULT_RATE_SETTINGS,
    high: {
      nightly: { aratiri: 149800, aguaribay: 149800 },
      minNights: 4,
      ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
    },
  };
  const CROSSING: State = { ...STATE, checkIn: new Date(2026, 11, 13), checkOut: new Date(2026, 11, 17) };

  it("separa las noches de baja y de alta en dos líneas", () => {
    const { container } = render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <OrderSummary state={CROSSING} settings={WITH_HIGH} method="card" />
      </NextIntlClientProvider>,
    );
    const bd = priceBreakdown(WITH_HIGH, "card", REAL_UNIT_ID, 4, 2, CROSSING.checkIn);
    expect(bd.lines).toHaveLength(2);
    const text = container.textContent ?? "";
    expect(text).toContain(`Temporada baja · ${money(bd.lines[0].nightly)} × 2`);
    expect(text).toContain(`Temporada alta · ${money(bd.lines[1].nightly)} × 2`);
    expect(screen.getByText(money(bd.total))).toBeTruthy();
  });

  it("sin noches de alta no muestra la etiqueta de temporada", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <OrderSummary state={STATE} settings={WITH_HIGH} method="card" />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText(/Temporada (baja|alta)/)).toBeNull();
  });
});

describe("OrderSummary con la promo de fin de semana", () => {
  const FRIDAY: State = { ...STATE, checkIn: new Date(2026, 8, 25), checkOut: new Date(2026, 8, 28) };
  const renderPromo = (settings: typeof DEFAULT_RATE_SETTINGS, state = FRIDAY) =>
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <OrderSummary state={state} settings={settings} method="card" />
      </NextIntlClientProvider>,
    );

  it("muestra la leyenda con las noches de fábrica", () => {
    renderPromo(DEFAULT_RATE_SETTINGS);
    expect(screen.getByText("Paquete fin de semana: 3 noches al valor de 2,5")).toBeInTheDocument();
  });

  it("la leyenda refleja las reglas configuradas", () => {
    const s = {
      ...DEFAULT_RATE_SETTINGS,
      low: { weekdayMinNights: 2, weekendMinNights: 2, packageEnabled: true, packageNights: 2, packageBilledNights: 1.5 },
    };
    renderPromo(s, { ...FRIDAY, checkOut: new Date(2026, 8, 27) });
    expect(screen.getByText("Paquete fin de semana: 2 noches al valor de 1,5")).toBeInTheDocument();
  });
});
