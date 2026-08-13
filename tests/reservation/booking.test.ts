import { describe, it, expect } from "vitest";
import { formatDateOnly, parseDateOnly, isValidDateOnly, validBookingRange } from "@/lib/reservation/booking";

describe("formatDateOnly", () => {
  it("formatea Date local a YYYY-MM-DD sin corrimiento de TZ", () => {
    expect(formatDateOnly(new Date(2026, 6, 2))).toBe("2026-07-02");
  });

  it("padea mes y día de un dígito a 2 dígitos", () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseDateOnly", () => {
  it("convierte YYYY-MM-DD a Date local a medianoche", () => {
    const d = parseDateOnly("2026-07-02");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // julio = 6
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(0);
  });
  it("es inversa de formatDateOnly", () => {
    expect(parseDateOnly("2026-12-31").getDate()).toBe(31);
  });
});

describe("validBookingRange", () => {
  const now = new Date(2026, 7, 13);

  it("rechaza fechas imposibles y pasadas", () => {
    expect(isValidDateOnly("2026-02-31")).toBe(false);
    expect(validBookingRange("2026-08-12", "2026-08-15", now)).toBe(false);
  });

  it("acepta un rango futuro dentro de los límites", () => {
    expect(validBookingRange("2026-08-20", "2026-08-23", now)).toBe(true);
  });

  it("rechaza estadías abusivamente largas o demasiado lejanas", () => {
    expect(validBookingRange("2026-08-20", "2026-11-01", now)).toBe(false);
    expect(validBookingRange("2027-09-01", "2027-09-03", now)).toBe(false);
  });
});
