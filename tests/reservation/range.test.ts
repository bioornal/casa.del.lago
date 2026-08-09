import { describe, it, expect } from "vitest";
import {
  pickDay,
  rangeHasBlocked,
  firstBlockedAfter,
  type RangeValue,
} from "@/lib/reservation/range";

const d = (s: string) => new Date(s + "T00:00:00");
const empty: RangeValue = { checkIn: null, checkOut: null };

describe("pickDay", () => {
  it("primer pick setea checkIn y limpia checkOut", () => {
    expect(pickDay(empty, d("2026-06-10"))).toEqual({ checkIn: d("2026-06-10"), checkOut: null });
  });
  it("segundo pick posterior setea checkOut", () => {
    const r = pickDay(empty, d("2026-06-10"));
    expect(pickDay(r, d("2026-06-13"))).toEqual({ checkIn: d("2026-06-10"), checkOut: d("2026-06-13") });
  });
  it("segundo pick anterior o igual reinicia el rango en esa fecha", () => {
    const r = pickDay(empty, d("2026-06-10"));
    expect(pickDay(r, d("2026-06-08"))).toEqual({ checkIn: d("2026-06-08"), checkOut: null });
    expect(pickDay(r, d("2026-06-10"))).toEqual({ checkIn: d("2026-06-10"), checkOut: null });
  });
  it("pick con rango completo empieza uno nuevo", () => {
    const full: RangeValue = { checkIn: d("2026-06-10"), checkOut: d("2026-06-13") };
    expect(pickDay(full, d("2026-06-20"))).toEqual({ checkIn: d("2026-06-20"), checkOut: null });
  });
});

// Fixture: una unidad con las noches del 21/07 al 01/08 ocupadas. El hueco que
// se corrige es elegir llegada el 20/07 y salida el 02/08: las dos puntas están
// libres, así que deshabilitar solo los días ocupados no alcanza y el bloque se
// salta por encima. La constraint de exclusión de Postgres igual lo rechaza,
// pero recién después de que el huésped cargó datos y tarjeta.
const OCUPADAS = [
  "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26",
  "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01",
].map(d);

describe("rangeHasBlocked", () => {
  it("detecta el salto por encima del bloque ocupado", () => {
    expect(rangeHasBlocked(d("2026-07-20"), d("2026-08-02"), OCUPADAS)).toBe(true);
  });

  it("un rango enteramente libre pasa", () => {
    expect(rangeHasBlocked(d("2026-08-05"), d("2026-08-08"), OCUPADAS)).toBe(false);
  });

  it("salir el primer día ocupado es válido: el check-out es exclusivo (turnover)", () => {
    // llega el 18, se va el 21 → ocupa las noches 18, 19 y 20. La noche 21 es del otro.
    expect(rangeHasBlocked(d("2026-07-18"), d("2026-07-21"), OCUPADAS)).toBe(false);
  });

  it("pisar una sola noche ocupada ya invalida el rango", () => {
    expect(rangeHasBlocked(d("2026-07-18"), d("2026-07-22"), OCUPADAS)).toBe(true);
  });

  it("llegar sobre una noche ocupada invalida", () => {
    expect(rangeHasBlocked(d("2026-07-21"), d("2026-07-23"), OCUPADAS)).toBe(true);
  });

  it("sin fechas ocupadas nunca bloquea", () => {
    expect(rangeHasBlocked(d("2026-07-20"), d("2026-08-02"), [])).toBe(false);
  });

  it("compara por día, ignorando la hora", () => {
    const conHora = [new Date("2026-07-22T18:30:00")];
    expect(rangeHasBlocked(d("2026-07-20"), d("2026-07-25"), conHora)).toBe(true);
  });
});

describe("firstBlockedAfter", () => {
  it("devuelve la primera noche ocupada posterior, que es el tope de la salida", () => {
    expect(firstBlockedAfter(d("2026-07-18"), OCUPADAS)).toEqual(d("2026-07-21"));
  });

  it("ignora las ocupadas anteriores o del mismo día", () => {
    expect(firstBlockedAfter(d("2026-07-25"), OCUPADAS)).toEqual(d("2026-07-26"));
  });

  it("null si no queda ninguna ocupada por delante", () => {
    expect(firstBlockedAfter(d("2026-08-02"), OCUPADAS)).toBeNull();
    expect(firstBlockedAfter(d("2026-07-18"), [])).toBeNull();
  });

  it("no depende del orden del array", () => {
    const desordenadas = [d("2026-08-01"), d("2026-07-21"), d("2026-07-25")];
    expect(firstBlockedAfter(d("2026-07-18"), desordenadas)).toEqual(d("2026-07-21"));
  });
});
