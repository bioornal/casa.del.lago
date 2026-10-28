import { describe, it, expect } from "vitest";
import {
  grossUp,
  methodRates,
  methodTotal,
  transferSavings,
  priceBreakdown,
  netNightly,
  stayLines,
} from "@/lib/reservation/method-pricing";
import type { RateSettings } from "@/lib/reservation/rate-settings";

const SETTINGS: RateSettings = {
  nightly: { aratiri: 130000, aguaribay: 95000 },
  cleaningFee: 30000,
  baseGuests: 2,
  extraGuestFee: 20000,
  cardFeePct: 7.7,
  transferFeePct: 5,
};

describe("grossUp", () => {
  it("neto ÷ (1 − pct) redondeado HACIA ARRIBA a $100", () => {
    // 130000 / 0.923 = 140845.07… → 140900
    expect(grossUp(130000, 7.7)).toBe(140900);
    // 130000 / 0.95 = 136842.1… → 136900
    expect(grossUp(130000, 5)).toBe(136900);
  });

  it("pct 0 = identidad (redondeada a $100 hacia arriba solo si hace falta)", () => {
    expect(grossUp(130000, 0)).toBe(130000);
    expect(grossUp(130050, 0)).toBe(130100);
  });

  it("neto 0 o negativo → 0", () => {
    expect(grossUp(0, 7.7)).toBe(0);
    expect(grossUp(-5, 7.7)).toBe(0);
  });

  it("el redondeo nunca deja el neto por debajo del objetivo", () => {
    for (const net of [1000, 30000, 95000, 110000, 130000, 999999]) {
      for (const pct of [5, 6.29, 7.61, 7.7, 10]) {
        const charged = grossUp(net, pct);
        const received = charged * (1 - pct / 100);
        expect(received).toBeGreaterThanOrEqual(net);
      }
    }
  });
});

describe("methodRates", () => {
  it("card grossea la noche con cardFeePct", () => {
    const r = methodRates(SETTINGS, "card");
    expect(r.nightly.aratiri).toBe(grossUp(SETTINGS.nightly.aratiri, SETTINGS.cardFeePct));
  });

  it("transfer grossea la noche con transferFeePct", () => {
    const r = methodRates(SETTINGS, "transfer");
    expect(r.nightly.aratiri).toBe(grossUp(SETTINGS.nightly.aratiri, SETTINGS.transferFeePct));
  });

  it("la limpieza NO se grossea: vale lo mismo en los dos métodos", () => {
    // El bug que este dominio arregla: la MISMA tasa aparecía a dos precios
    // según la pestaña, sin nada en pantalla que lo explicara.
    expect(methodRates(SETTINGS, "card").cleaningFee).toBe(SETTINGS.cleaningFee);
    expect(methodRates(SETTINGS, "transfer").cleaningFee).toBe(SETTINGS.cleaningFee);
  });

  it("suma el cargo por huésped adicional antes de calcular el costo del canal", () => {
    const net = SETTINGS.nightly.aguaribay + 5 * SETTINGS.extraGuestFee;
    expect(netNightly(SETTINGS, "aguaribay", 7)).toBe(net);
    expect(methodRates(SETTINGS, "card", 7).nightly.aguaribay).toBe(grossUp(net, SETTINGS.cardFeePct));
  });
});

describe("methodTotal", () => {
  it("total = noche grosseada × noches + limpieza al neto", () => {
    const cardNight = grossUp(SETTINGS.nightly.aratiri, SETTINGS.cardFeePct);
    const trNight = grossUp(SETTINGS.nightly.aratiri, SETTINGS.transferFeePct);
    expect(methodTotal(SETTINGS, "card", "aratiri", 3)).toBe(cardNight * 3 + SETTINGS.cleaningFee);
    expect(methodTotal(SETTINGS, "transfer", "aratiri", 3)).toBe(trNight * 3 + SETTINGS.cleaningFee);
  });

  it("0 noches → 0", () => {
    expect(methodTotal(SETTINGS, "card", "aratiri", 0)).toBe(0);
  });
});

describe("transferSavings", () => {
  it("ahorro = totalCard − totalTransfer, positivo con card > transfer", () => {
    expect(transferSavings(SETTINGS, "aratiri", 3)).toBe(
      methodTotal(SETTINGS, "card", "aratiri", 3) - methodTotal(SETTINGS, "transfer", "aratiri", 3),
    );
  });

  it("nunca negativo aunque los pct estén invertidos", () => {
    const inverted = { ...SETTINGS, cardFeePct: 2, transferFeePct: 9 };
    expect(transferSavings(inverted, "aratiri", 3)).toBe(0);
  });
});

describe("priceBreakdown", () => {
  it("los dos métodos muestran el MISMO precio de lista", () => {
    // Es el corazón del arreglo: la única diferencia visible entre las dos
    // pestañas pasa a ser el descuento, no dos juegos de importes.
    const card = priceBreakdown(SETTINGS, "card", "aratiri", 3);
    const tr = priceBreakdown(SETTINGS, "transfer", "aratiri", 3);
    expect(tr.nightly).toBe(card.nightly);
    expect(tr.cleaningFee).toBe(card.cleaningFee);
    expect(tr.listTotal).toBe(card.listTotal);
  });

  it("con tarjeta no hay descuento; con transferencia es el ahorro", () => {
    const card = priceBreakdown(SETTINGS, "card", "aratiri", 3);
    const tr = priceBreakdown(SETTINGS, "transfer", "aratiri", 3);
    expect(card.discount).toBe(0);
    expect(tr.discount).toBe(transferSavings(SETTINGS, "aratiri", 3));
  });

  it("el desglose es lineal: lodging + limpieza − descuento = total", () => {
    for (const method of ["card", "transfer"] as const) {
      for (const nights of [1, 2, 3, 7]) {
        const bd = priceBreakdown(SETTINGS, method, "aratiri", nights);
        expect(bd.lodging).toBe(bd.nightly * nights);
        expect(bd.listTotal).toBe(bd.lodging + bd.cleaningFee);
        expect(bd.listTotal - bd.discount).toBe(bd.total);
      }
    }
  });

  it("el total mostrado es el que recalculan las rutas de cobro", () => {
    // Si estos dos divergieran, el huésped vería un precio y se le cobraría
    // otro. /api/payments y /api/reservations/transfer usan methodTotal.
    for (const method of ["card", "transfer"] as const) {
      for (const nights of [1, 2, 3, 7]) {
        expect(priceBreakdown(SETTINGS, method, "aratiri", nights).total).toBe(
          methodTotal(SETTINGS, method, "aratiri", nights),
        );
      }
    }
  });

  it("0 noches → todo en cero, sin descuento", () => {
    const bd = priceBreakdown(SETTINGS, "transfer", "aratiri", 0);
    expect(bd.lodging).toBe(0);
    expect(bd.total).toBe(0);
    expect(bd.discount).toBe(0);
  });

  it("aplica el paquete de viernes: 3 noches cobradas como 2,5", () => {
    const friday = new Date(2026, 8, 25);
    const bd = priceBreakdown(SETTINGS, "card", "aguaribay", 3, 2, friday);
    expect(bd.billedNights).toBe(2.5);
    expect(bd.lodging).toBe(bd.nightly * 2.5);
    expect(bd.total).toBe(methodTotal(SETTINGS, "card", "aguaribay", 3, 2, friday));
  });

  it("usa las noches del paquete configuradas en las reglas de baja", () => {
    const friday = new Date(2026, 8, 25);
    const s: RateSettings = {
      ...SETTINGS,
      low: { weekdayMinNights: 2, weekendMinNights: 2, packageEnabled: true, packageNights: 2, packageBilledNights: 1.5 },
    };
    expect(priceBreakdown(s, "card", "aguaribay", 2, 2, friday).billedNights).toBe(1.5);
    expect(priceBreakdown(s, "card", "aguaribay", 3, 2, friday).billedNights).toBe(3);
    const off: RateSettings = { ...s, low: { ...s.low!, packageEnabled: false } };
    expect(priceBreakdown(off, "card", "aguaribay", 2, 2, friday).billedNights).toBe(2);
  });
});

describe("temporada alta", () => {
  const WITH_HIGH: RateSettings = {
    ...SETTINGS,
    high: {
      nightly: { aratiri: 150000, aguaribay: 150000 },
      minNights: 4,
      ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
    },
  };
  const lowNight = grossUp(SETTINGS.nightly.aguaribay, SETTINGS.cardFeePct);
  const highNight = grossUp(150000, SETTINGS.cardFeePct);

  it("estadía toda en alta: noches al precio de alta", () => {
    const checkIn = new Date(2027, 0, 11);
    expect(methodTotal(WITH_HIGH, "card", "aguaribay", 4, 2, checkIn)).toBe(highNight * 4 + SETTINGS.cleaningFee);
  });

  it("estadía que cruza: cada noche con su temporada, en dos líneas", () => {
    const checkIn = new Date(2026, 11, 13); // 13 y 14 baja, 15 y 16 alta
    const lines = stayLines(WITH_HIGH, "card", "aguaribay", 4, 2, checkIn);
    expect(lines).toEqual([
      { season: "low", nights: 2, billed: 2, nightly: lowNight },
      { season: "high", nights: 2, billed: 2, nightly: highNight },
    ]);
    expect(methodTotal(WITH_HIGH, "card", "aguaribay", 4, 2, checkIn)).toBe(
      lowNight * 2 + highNight * 2 + SETTINGS.cleaningFee,
    );
  });

  it("huésped extra se suma también en alta", () => {
    expect(netNightly(WITH_HIGH, "aratiri", 4, "high")).toBe(150000 + 2 * SETTINGS.extraGuestFee);
  });

  it("viernes con 3 noches en alta: sin promo", () => {
    const friday = new Date(2027, 0, 15);
    const bd = priceBreakdown(WITH_HIGH, "card", "aguaribay", 3, 2, friday);
    expect(bd.weekendPackage).toBe(false);
    expect(bd.billedNights).toBe(3);
    expect(bd.total).toBe(highNight * 3 + SETTINGS.cleaningFee);
  });

  it("viernes con 3 noches en baja: la promo sigue", () => {
    const friday = new Date(2026, 8, 25);
    const bd = priceBreakdown(WITH_HIGH, "card", "aguaribay", 3, 2, friday);
    expect(bd.weekendPackage).toBe(true);
    expect(bd.billedNights).toBe(2.5);
  });

  it("el desglose suma el total en cruces, por los dos métodos", () => {
    const checkIn = new Date(2026, 11, 13);
    for (const method of ["card", "transfer"] as const) {
      const bd = priceBreakdown(WITH_HIGH, method, "aguaribay", 4, 2, checkIn);
      expect(bd.lodging).toBe(bd.lines.reduce((n, l) => n + l.nightly * l.billed, 0));
      expect(bd.listTotal - bd.discount).toBe(bd.total);
      expect(bd.total).toBe(methodTotal(WITH_HIGH, method, "aguaribay", 4, 2, checkIn));
    }
  });

  it("sin bloque high, nada cambia", () => {
    const checkIn = new Date(2027, 0, 11);
    expect(methodTotal(SETTINGS, "card", "aguaribay", 4, 2, checkIn)).toBe(lowNight * 4 + SETTINGS.cleaningFee);
  });
});
