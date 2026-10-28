import { describe, it, expect } from "vitest";
import { meetsStayMinimum, minimumNights, isWeekendPackage } from "@/lib/reservation/stay-rules";

describe("stay rules", () => {
  it("requiere dos noches de lunes a jueves", () => {
    const monday = new Date(2026, 8, 21);
    expect(minimumNights(monday)).toBe(2);
    expect(meetsStayMinimum(monday, new Date(2026, 8, 23))).toBe(true);
    expect(meetsStayMinimum(monday, new Date(2026, 8, 22))).toBe(false);
  });

  it("requiere tres noches para el fin de semana", () => {
    const friday = new Date(2026, 8, 25);
    expect(minimumNights(friday)).toBe(3);
    expect(isWeekendPackage(friday, 3)).toBe(true);
    expect(isWeekendPackage(friday, 2)).toBe(false);
  });
});

const HIGH = {
  high: {
    nightly: { aratiri: 149800, aguaribay: 149800 },
    minNights: 4,
    ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
  },
};

describe("stay rules con temporada alta", () => {
  it("con llegada en alta rige el mínimo de alta, cualquier día", () => {
    const tuesday = new Date(2027, 0, 12);
    const friday = new Date(2027, 0, 15);
    expect(minimumNights(tuesday, HIGH)).toBe(4);
    expect(minimumNights(friday, HIGH)).toBe(4);
    expect(meetsStayMinimum(friday, new Date(2027, 0, 18), HIGH)).toBe(false);
    expect(meetsStayMinimum(friday, new Date(2027, 0, 19), HIGH)).toBe(true);
  });

  it("con llegada en baja rige la regla de baja aunque haya alta configurada", () => {
    const monday = new Date(2026, 10, 2);
    expect(minimumNights(monday, HIGH)).toBe(2);
  });

  it("la promo no aplica si alguna de las 3 noches es de alta", () => {
    expect(isWeekendPackage(new Date(2026, 11, 11), 3, HIGH)).toBe(true); // vie 11/12: noches 11–13, baja
    expect(isWeekendPackage(new Date(2027, 0, 15), 3, HIGH)).toBe(false); // vie 15/1: dentro de alta
  });

  it("la promo no aplica si la estadía cruza al inicio de la alta", () => {
    const highFromSunday = { high: { ...HIGH.high, ranges: [{ from: "2026-12-13", to: "2027-02-28" }] } };
    const friday = new Date(2026, 11, 11); // noches 11 y 12 baja, 13 alta
    expect(isWeekendPackage(friday, 3, highFromSunday)).toBe(false);
  });
});
