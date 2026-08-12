import { describe, it, expect } from "vitest";
import {
  TEST_UNIT_ID, TEST_UNIT_TOTAL, TEST_UNIT,
  isTestUnit, allowsTestUnit, resolveUnit, checkoutTotal, checkoutSavings,
} from "@/lib/reservation/test-unit";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { methodTotal, transferSavings } from "@/lib/reservation/method-pricing";
import { getUnit } from "@/lib/units";

describe("la unidad de prueba", () => {
  it("no es ninguna de las unidades reales", () => {
    expect(isTestUnit(TEST_UNIT_ID)).toBe(true);
    expect(isTestUnit("aratiri")).toBe(false);
    expect(isTestUnit("aguaribay")).toBe(false);
    expect(getUnit(TEST_UNIT_ID as never)).toBeUndefined();
  });

  it("declara 6 huéspedes: con más quedaría inalcanzable desde la URL", () => {
    // parseGuests (search.ts) rechaza > 6.
    expect(TEST_UNIT.specs.guests).toBe(6);
  });

  it("el nombre le avisa al huésped que no es una reserva real", () => {
    expect(TEST_UNIT.name.toLowerCase()).toContain("prueba");
  });
});

describe("allowsTestUnit", () => {
  it("el flag solo no alcanza: hay que pedir la unidad de prueba", () => {
    // Si bastara el flag, prender el toggle abriría el checkout de las
    // unidades reales a cualquiera con un deep-link.
    expect(allowsTestUnit("aratiri", true)).toBe(false);
    expect(allowsTestUnit(undefined, true)).toBe(false);
    expect(allowsTestUnit(TEST_UNIT_ID, true)).toBe(true);
  });

  it("con el flag apagado no pasa ni pidiéndola", () => {
    expect(allowsTestUnit(TEST_UNIT_ID, false)).toBe(false);
  });
});

describe("checkoutTotal y checkoutSavings", () => {
  it("para una unidad real devuelven exactamente lo de siempre", () => {
    // Es lo que hace que cambiar methodTotal por checkoutTotal en el checkout
    // no altere un solo importe de un huésped real.
    for (const method of ["card", "transfer"] as const) {
      for (const nights of [1, 3, 7]) {
        expect(checkoutTotal(DEFAULT_RATE_SETTINGS, method, "aratiri", nights))
          .toBe(methodTotal(DEFAULT_RATE_SETTINGS, method, "aratiri", nights));
      }
    }
    expect(checkoutSavings(DEFAULT_RATE_SETTINGS, "aguaribay", 3))
      .toBe(transferSavings(DEFAULT_RATE_SETTINGS, "aguaribay", 3));
  });

  it("la de prueba es un precio plano que no depende de las noches", () => {
    for (const nights of [1, 3, 30]) {
      expect(checkoutTotal(DEFAULT_RATE_SETTINGS, "card", TEST_UNIT_ID, nights)).toBe(TEST_UNIT_TOTAL);
    }
  });

  it("la de prueba no ofrece ahorro por transferencia: es solo tarjeta", () => {
    expect(checkoutSavings(DEFAULT_RATE_SETTINGS, TEST_UNIT_ID, 3)).toBe(0);
  });

  it("resolveUnit devuelve la ficha correcta según el id", () => {
    expect(resolveUnit(TEST_UNIT_ID).slug).toBe(TEST_UNIT_ID);
    expect(resolveUnit("aratiri").name).toBe(getUnit("aratiri")!.name);
  });
});
