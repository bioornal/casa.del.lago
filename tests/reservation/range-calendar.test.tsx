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
});
