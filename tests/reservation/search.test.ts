import { describe, it, expect } from "vitest";
import { parseRateQuery, parseCheckoutQuery, buildTarifasUrl, buildCheckoutUrl } from "@/lib/reservation/search";

describe("parseRateQuery", () => {
  it("acepta fechas válidas y guests en [1,6]", () => {
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "4" }))
      .toEqual({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: 4 });
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "6" }))
      .toEqual({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: 6 });
  });
  it("rechaza formato de fecha inválido", () => {
    expect(parseRateQuery({ checkIn: "02-07-2026", checkOut: "2026-07-05", guests: "2" })).toBeNull();
  });
  it("rechaza checkOut <= checkIn", () => {
    expect(parseRateQuery({ checkIn: "2026-07-05", checkOut: "2026-07-05", guests: "2" })).toBeNull();
    expect(parseRateQuery({ checkIn: "2026-07-06", checkOut: "2026-07-05", guests: "2" })).toBeNull();
  });
  it("rechaza guests fuera de rango o no entero", () => {
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "0" })).toBeNull();
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "7" })).toBeNull();
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "8" })).toBeNull();
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "9" })).toBeNull();
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "2.5" })).toBeNull();
    expect(parseRateQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: undefined })).toBeNull();
  });
});

describe("parseCheckoutQuery", () => {
  it("requiere además una unidad válida", () => {
    expect(parseCheckoutQuery({ unit: "aguaribay", checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "4" }))
      .toEqual({ unitId: "aguaribay", checkIn: "2026-07-02", checkOut: "2026-07-05", guests: 4 });
    expect(parseCheckoutQuery({ unit: "xxx", checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "4" })).toBeNull();
    expect(parseCheckoutQuery({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "4" })).toBeNull();
  });

  it("sin opts, la unidad de prueba se rechaza", () => {
    // El default es false a propósito: quien no opta explícitamente sigue
    // rechazándola. El único que puede optar es el server.
    expect(parseCheckoutQuery({ unit: "prueba", checkIn: "2027-01-01", checkOut: "2027-01-02", guests: "2" })).toBeNull();
  });

  it("con allowTestUnit la acepta, y sigue rechazando basura", () => {
    const opts = { allowTestUnit: true };
    expect(parseCheckoutQuery({ unit: "prueba", checkIn: "2027-01-01", checkOut: "2027-01-02", guests: "2" }, opts)).not.toBeNull();
    expect(parseCheckoutQuery({ unit: "inventada", checkIn: "2027-01-01", checkOut: "2027-01-02", guests: "2" }, opts)).toBeNull();
  });
});

describe("builders", () => {
  it("buildTarifasUrl arma la query", () => {
    expect(buildTarifasUrl({ checkIn: "2026-07-02", checkOut: "2026-07-05", guests: 4 }))
      .toBe("/tarifas?checkIn=2026-07-02&checkOut=2026-07-05&guests=4");
  });
  it("buildCheckoutUrl incluye la unidad", () => {
    expect(buildCheckoutUrl({ unitId: "aguaribay", checkIn: "2026-07-02", checkOut: "2026-07-05", guests: 3 }))
      .toBe("/reservas?unit=aguaribay&checkIn=2026-07-02&checkOut=2026-07-05&guests=3");
  });
});
