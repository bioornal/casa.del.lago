import type { UnitSlug } from "@/lib/units";
import type { RateSettings } from "./rate-settings";
import { computeTotal } from "./pricing";
import { billedNights as getBilledNights } from "./stay-rules";

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
// (con 7,7% son ~$2.310 por reserva: la comisión que Mercado Pago retiene
// sobre los $30.000 de limpieza, 30.000 × 7,7%). Si se quiere recuperar, se
// sube la tarifa neta por noche en /admin/tarifas.
//
// Nota para quien compare esto con el plan/spec del dominio: ahí figura
// "$2.600 con tarjeta". No es un error de cálculo, mide otra cosa — cuánto
// BAJA el precio cobrado si se paga por transferencia en vez de tarjeta para
// una noche de $30.000 grosseada (32.600 con tarjeta → 30.000 sin comisión).
// $2.310 (acá arriba) es lo que el lodge ABSORBE en la línea de limpieza;
// $2.600 es cuánto ve bajar el huésped en una noche. Magnitudes distintas,
// ninguna de las dos está mal.

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

/** Neto por noche según la cantidad de huéspedes elegida. */
export function netNightly(s: RateSettings, slug: UnitSlug, guests = s.baseGuests): number {
  return s.nightly[slug] + Math.max(0, guests - s.baseGuests) * s.extraGuestFee;
}

/** Tarifas públicas (por noche + limpieza) del método. */
export function methodRates(s: RateSettings, method: PaymentMethod, guests = s.baseGuests): MethodRates {
  const pct = pctFor(s, method);
  return {
    nightly: {
      aratiri: grossUp(netNightly(s, "aratiri", guests), pct),
      aguaribay: grossUp(netNightly(s, "aguaribay", guests), pct),
    },
    // Sin gross-up, a propósito: ver el comentario de cabecera.
    cleaningFee: s.cleaningFee,
  };
}

export function methodTotal(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): number {
  const r = methodRates(s, method, guests);
  return computeTotal(r.nightly[slug], getBilledNights(checkIn, nights), r.cleaningFee);
}

/** Ahorro en pesos pagando por transferencia vs tarjeta (piso 0). */
export function transferSavings(
  s: RateSettings,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): number {
  return Math.max(0, methodTotal(s, "card", slug, nights, guests, checkIn) - methodTotal(s, "transfer", slug, nights, guests, checkIn));
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
  billedNights: number;
  lodging: number;      // nightly × noches cobradas
  cleaningFee: number;  // el neto configurado, sin gross-up; 0 si nights <= 0 (no hay estadía que limpiar)
  listTotal: number;    // lodging + cleaningFee (precio de lista), siempre — incluso con nights <= 0
  discount: number;     // 0 con tarjeta; el ahorro con transferencia
  total: number;        // listTotal − discount = lo que se cobra
};

export function priceBreakdown(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): PriceBreakdown {
  const list = methodRates(s, "card", guests);
  const nightly = list.nightly[slug];
  const billed = getBilledNights(checkIn, nights);
  const lodging = nightly * Math.max(0, billed);
  // Sin noches no hay estadía, así que tampoco hay línea de limpieza: si no,
  // listTotal (computeTotal, que devuelve 0 con nights <= 0) dejaría de ser
  // lodging + cleaningFee y el tipo de arriba mentiría.
  const cleaningFee = nights > 0 ? list.cleaningFee : 0;
  const listTotal = computeTotal(nightly, billed, list.cleaningFee);
  const total = methodTotal(s, method, slug, nights, guests, checkIn);
  return {
    nightly,
    nights,
    billedNights: billed,
    lodging,
    cleaningFee,
    listTotal,
    discount: Math.max(0, listTotal - total),
    total,
  };
}
