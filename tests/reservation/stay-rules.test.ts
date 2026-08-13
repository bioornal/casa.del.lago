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
