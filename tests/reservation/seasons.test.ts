import { describe, it, expect } from "vitest";
import { seasonOf, nightSeasons, parseSeasonRanges, MAX_SEASON_RANGES } from "@/lib/reservation/seasons";

const RANGES = [{ from: "2026-12-15", to: "2027-02-28" }];

describe("seasonOf", () => {
  it("los bordes del rango son de alta (inclusive)", () => {
    expect(seasonOf(new Date(2026, 11, 15), RANGES)).toBe("high");
    expect(seasonOf(new Date(2027, 1, 28), RANGES)).toBe("high");
  });
  it("el día anterior y el siguiente son de baja", () => {
    expect(seasonOf(new Date(2026, 11, 14), RANGES)).toBe("low");
    expect(seasonOf(new Date(2027, 2, 1), RANGES)).toBe("low");
  });
  it("sin rangos todo es baja", () => {
    expect(seasonOf(new Date(2027, 0, 10), [])).toBe("low");
  });
});

describe("nightSeasons", () => {
  it("una entrada por noche, cruzando el inicio del rango", () => {
    expect(nightSeasons(new Date(2026, 11, 13), 4, RANGES)).toEqual(["low", "low", "high", "high"]);
  });
  it("0 noches → lista vacía", () => {
    expect(nightSeasons(new Date(2026, 11, 13), 0, RANGES)).toEqual([]);
  });
});

describe("parseSeasonRanges", () => {
  it("acepta y ordena por fecha de inicio", () => {
    expect(
      parseSeasonRanges([
        { from: "2027-07-10", to: "2027-07-25" },
        { from: "2026-12-15", to: "2027-02-28" },
      ]),
    ).toEqual([
      { from: "2026-12-15", to: "2027-02-28" },
      { from: "2027-07-10", to: "2027-07-25" },
    ]);
  });
  it("lista vacía es válida", () => {
    expect(parseSeasonRanges([])).toEqual([]);
  });
  it("rechaza desde > hasta, fechas inválidas, superposición y no-listas", () => {
    expect(parseSeasonRanges([{ from: "2027-01-10", to: "2027-01-05" }])).toBeNull();
    expect(parseSeasonRanges([{ from: "2027-02-30", to: "2027-03-05" }])).toBeNull();
    expect(parseSeasonRanges([{ from: "15/12/2026", to: "2027-01-05" }])).toBeNull();
    expect(
      parseSeasonRanges([
        { from: "2026-12-15", to: "2027-01-10" },
        { from: "2027-01-10", to: "2027-01-20" },
      ]),
    ).toBeNull();
    expect(parseSeasonRanges("nope")).toBeNull();
    expect(parseSeasonRanges([null])).toBeNull();
  });
  it("rechaza más del máximo de rangos", () => {
    const many = Array.from({ length: MAX_SEASON_RANGES + 1 }, (_, i) => {
      const d = `2030-01-${String(i + 1).padStart(2, "0")}`;
      return { from: d, to: d };
    });
    expect(parseSeasonRanges(many)).toBeNull();
  });
});
