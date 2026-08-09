// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { RangeCalendar } from "@/components/reservas/RangeCalendar";

vi.mock("next-intl", () => ({ useLocale: () => "es" }));

describe("RangeCalendar", () => {
  it("marca como deshabilitado un día ocupado provisto en disabledDates", () => {
    // Nota: debe ser una fecha futura (no cubierta por el `{ before: new Date() }`
    // ya existente en el componente) para que el test realmente ejerza `disabledDates`
    // y no dé un falso positivo por caer en el pasado.
    const busy = new Date(2026, 6, 28); // 28 jul 2026, dentro del mes por defecto
    const { container } = render(
      <RangeCalendar
        value={{ checkIn: null, checkOut: null }}
        onChange={() => {}}
        disabledDates={[busy]}
      />,
    );
    // react-day-picker marca la celda del día con data-day="YYYY-MM-DD" y, si está
    // deshabilitado, con la clase .rdp-disabled (además de disabled="" en el <button>
    // interno). Se apunta puntualmente a la celda del día ocupado: usar un selector
    // genérico como "cualquier .rdp-disabled en el calendario" da un falso positivo,
    // porque los días pasados (regla `{ before: new Date() }` ya existente) y los días
    // fuera del mes también reciben esa clase.
    const busyCell = container.querySelector('[data-day="2026-07-28"]');
    expect(busyCell).not.toBeNull();
    expect(busyCell?.className).toContain("rdp-disabled");
  });

  it("con la llegada elegida, topea la salida en la primera noche ocupada", () => {
    // Las fechas tienen que ser FUTURAS: la regla `{ before: new Date() }` del
    // componente deshabilita todo el pasado, y un día pasado daría un falso
    // negativo (aparecería deshabilitado por viejo, no por el tope).
    const checkIn = new Date(2026, 8, 20); // 20 sep 2026
    const ocupadas = [new Date(2026, 8, 22), new Date(2026, 8, 23)];
    const { container } = render(
      <RangeCalendar
        value={{ checkIn, checkOut: null }}
        onChange={() => {}}
        disabledDates={ocupadas}
      />,
    );

    // La primera noche ocupada sigue elegible como salida: el check-out es
    // exclusivo, así que irse el 22 no ocupa la noche del 22 (turnover).
    // Excluirla perdería una noche vendible en cada borde.
    const tope = container.querySelector('[data-day="2026-09-22"]');
    expect(tope).not.toBeNull();
    expect(tope?.className).not.toContain("rdp-disabled");

    // El 24 está libre, pero queda fuera por ser posterior al tope: si fuera
    // elegible, el huésped saltaría el bloque ocupado por encima.
    const despues = container.querySelector('[data-day="2026-09-24"]');
    expect(despues).not.toBeNull();
    expect(despues?.className).toContain("rdp-disabled");
  });
});
