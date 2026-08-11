import type { UnitSlug } from "@/lib/units";
import type { RateSettings } from "./rate-settings";
import { computeTotal } from "./pricing";

// Precios por método de pago. El dueño configura en /admin/tarifas lo que quiere
// RECIBIR NETO; el público ve/paga el precio con el costo del canal incluido:
//   precio_público = neto ÷ (1 − pct/100), redondeado HACIA ARRIBA a $100.
// El precio de lista es el de TARJETA (nunca se muestra "recargo" — ley 25.065);
// la transferencia, más barata para el lodge, se presenta como ahorro.
//
// LA LIMPIEZA NO SE GROSSEA. Es un importe que el huésped reconoce como fijo
// ($30.000), y aplicarle el gross-up hacía que la MISMA tasa apareciera en
// $32.600 con tarjeta y $31.600 con transferencia, sin nada en pantalla que lo
// explicara: comparando las dos pestañas parecía un error. Ahora la comisión se
// recupera solo sobre la noche y la limpieza se muestra siempre al valor
// configurado. Costo de la decisión: el lodge absorbe la comisión de esa línea
// (con 7,7% son ~$2.310 por reserva). Si se quiere recuperar, se sube la tarifa
// neta por noche en /admin/tarifas.

export type PaymentMethod = "card" | "transfer";

/** Grossea un neto para que, tras retener `feePct`%, quede al menos el neto. */
export function grossUp(net: number, feePct: number): number {
  if (net <= 0) return 0;
  const f = Math.min(Math.max(feePct, 0), 50) / 100;
  return Math.ceil(net / (1 - f) / 100) * 100;
}

function pctFor(s: RateSettings, method: PaymentMethod): number {
  return method === "card" ? s.cardFeePct : s.transferFeePct;
}

export type MethodRates = { nightly: Record<UnitSlug, number>; cleaningFee: number };

/** Tarifas públicas (por noche + limpieza) del método. Lineal: el desglose suma el total. */
export function methodRates(s: RateSettings, method: PaymentMethod): MethodRates {
  const pct = pctFor(s, method);
  return {
    nightly: {
      aratiri: grossUp(s.nightly.aratiri, pct),
      aguaribay: grossUp(s.nightly.aguaribay, pct),
    },
    // Sin gross-up, a propósito: ver el comentario de cabecera.
    cleaningFee: s.cleaningFee,
  };
}

export function methodTotal(s: RateSettings, method: PaymentMethod, slug: UnitSlug, nights: number): number {
  const r = methodRates(s, method);
  return computeTotal(r.nightly[slug], nights, r.cleaningFee);
}

/** Ahorro en pesos pagando por transferencia vs tarjeta (piso 0). */
export function transferSavings(s: RateSettings, slug: UnitSlug, nights: number): number {
  return Math.max(0, methodTotal(s, "card", slug, nights) - methodTotal(s, "transfer", slug, nights));
}

/**
 * Desglose para MOSTRAR. Las dos pestañas del checkout muestran el mismo precio
 * de lista (el de tarjeta) y la transferencia agrega una línea de descuento; así
 * la única diferencia visible entre métodos es el beneficio, y no hay dos
 * precios distintos para los mismos conceptos.
 *
 * `total` es lo que se cobra de verdad y coincide con methodTotal(method), que
 * es lo que recalculan /api/payments y /api/reservations/transfer.
 */
export type PriceBreakdown = {
  nightly: number;      // precio de lista por noche (tarjeta), igual en ambos métodos
  nights: number;
  lodging: number;      // nightly × nights
  cleaningFee: number;  // el neto configurado, sin gross-up
  listTotal: number;    // lodging + cleaningFee (precio de lista)
  discount: number;     // 0 con tarjeta; el ahorro con transferencia
  total: number;        // listTotal − discount = lo que se cobra
};

export function priceBreakdown(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
): PriceBreakdown {
  const list = methodRates(s, "card");
  const nightly = list.nightly[slug];
  const lodging = nightly * Math.max(0, nights);
  const listTotal = computeTotal(nightly, nights, list.cleaningFee);
  const total = methodTotal(s, method, slug, nights);
  return {
    nightly,
    nights,
    lodging,
    cleaningFee: list.cleaningFee,
    listTotal,
    discount: Math.max(0, listTotal - total),
    total,
  };
}
