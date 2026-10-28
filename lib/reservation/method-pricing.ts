import type { UnitSlug } from "@/lib/units";
import type { RateSettings } from "./rate-settings";
import { nightSeasons, type Season } from "./seasons";
import { isWeekendPackage, lowRules } from "./stay-rules";

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

/** Neto por noche según huéspedes y temporada. Sin bloque high, "high" cae al precio de baja. */
export function netNightly(s: RateSettings, slug: UnitSlug, guests = s.baseGuests, season: Season = "low"): number {
  const base = season === "high" && s.high ? s.high.nightly[slug] : s.nightly[slug];
  return base + Math.max(0, guests - s.baseGuests) * s.extraGuestFee;
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

/** Un tramo de noches consecutivas de la misma temporada. `billed` < `nights` solo con la promo. */
export type StayLine = { season: Season; nights: number; billed: number; nightly: number };

/** Tramos de la estadía con el precio por noche del método. Sin checkIn no hay fechas: todo baja. */
export function stayLines(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): StayLine[] {
  if (nights <= 0) return [];
  const pct = pctFor(s, method);
  const price = (season: Season) => grossUp(netNightly(s, slug, guests, season), pct);
  const seasons: Season[] = checkIn
    ? nightSeasons(checkIn, nights, s.high?.ranges ?? [])
    : Array.from({ length: nights }, () => "low" as const);
  const lines: StayLine[] = [];
  for (const season of seasons) {
    const last = lines[lines.length - 1];
    if (last && last.season === season) {
      last.nights++;
      last.billed++;
    } else {
      lines.push({ season, nights: 1, billed: 1, nightly: price(season) });
    }
  }
  // La promo exige todas las noches en baja, así que siempre es una sola línea.
  if (checkIn && isWeekendPackage(checkIn, nights, s)) lines[0].billed = lowRules(s).packageBilledNights;
  return lines;
}

const lodgingOf = (lines: StayLine[]) => lines.reduce((sum, l) => sum + l.nightly * l.billed, 0);

export function methodTotal(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): number {
  if (nights <= 0) return 0;
  // Limpieza al neto, sin gross-up (ver cabecera).
  return lodgingOf(stayLines(s, method, slug, nights, guests, checkIn)) + s.cleaningFee;
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
  nightly: number;      // precio de lista por noche de la primera línea (tarjeta), igual en ambos métodos
  nights: number;
  billedNights: number; // suma de noches cobradas (2,5 con la promo)
  lines: StayLine[];    // tramos por temporada, precio de lista (tarjeta)
  lodging: number;      // Σ nightly × billed de las líneas
  cleaningFee: number;  // el neto configurado, sin gross-up; 0 si nights <= 0 (no hay estadía que limpiar)
  listTotal: number;    // lodging + cleaningFee (precio de lista); 0 si nights <= 0
  discount: number;     // 0 con tarjeta; el ahorro con transferencia
  total: number;        // listTotal − discount = lo que se cobra
  weekendPackage: boolean;
};

export function priceBreakdown(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): PriceBreakdown {
  const lines = stayLines(s, "card", slug, nights, guests, checkIn);
  const lodging = lodgingOf(lines);
  // Sin noches no hay estadía, así que tampoco hay línea de limpieza.
  const cleaningFee = nights > 0 ? s.cleaningFee : 0;
  const listTotal = nights > 0 ? lodging + cleaningFee : 0;
  const total = methodTotal(s, method, slug, nights, guests, checkIn);
  return {
    nightly: lines[0]?.nightly ?? methodRates(s, "card", guests).nightly[slug],
    nights,
    billedNights: lines.reduce((n, l) => n + l.billed, 0),
    lines,
    lodging,
    cleaningFee,
    listTotal,
    discount: Math.max(0, listTotal - total),
    total,
    weekendPackage: !!checkIn && isWeekendPackage(checkIn, nights, s),
  };
}
