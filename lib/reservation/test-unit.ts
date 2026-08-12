import { getUnit, type Unit, type UnitSlug } from "@/lib/units";
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
import type { RateSettings } from "./rate-settings";
import { methodTotal, transferSavings, type PaymentMethod } from "./method-pricing";

// Unidad de alojamiento que NO existe, para probar la cadena completa de una
// reserva pagada (cobro → Supabase → emails → lookup) sin cobrarle una estadía
// real a nadie. Se habilita con el toggle de /admin/configuracion.
//
// Este módulo es el dueño único del ID y del monto. Igual que el TEST_AMOUNT de
// app/api/admin/test-payment/route.ts, el monto vive ACÁ y en ningún otro lado:
// nunca viaja desde el cliente, el server siempre lo recalcula con checkoutTotal.
//
// $2.500 y no $1.000 como el pago de prueba de /admin/pago-prueba: son dos
// herramientas distintas y conviene distinguirlas de un vistazo en la actividad
// de Mercado Pago.

export const TEST_UNIT_ID = "prueba";
export const TEST_UNIT_TOTAL = 2500;

export type BookableUnitId = UnitSlug | typeof TEST_UNIT_ID;
export type BookableUnit = Omit<Unit, "slug"> & { slug: BookableUnitId };

export const TEST_UNIT: BookableUnit = {
  slug: TEST_UNIT_ID,
  // Si alguien llega por accidente al checkout, tiene que verlo en el nombre.
  name: "UNIDAD DE PRUEBA — no es una reserva real",
  price: TEST_UNIT_TOTAL,
  // 6 y no más: parseGuests (lib/reservation/search.ts) rechaza > 6, así que
  // una unidad con más huéspedes declarados sería inalcanzable desde la URL.
  specs: { guests: 6, bedrooms: 1, baths: 1, area: 1 },
};

export function isTestUnit(id: string): id is typeof TEST_UNIT_ID {
  return id === TEST_UNIT_ID;
}

/**
 * Las DOS condiciones, no una. Si bastara el flag global, prender el toggle
 * de /admin/configuracion abriría el checkout de las unidades REALES a
 * cualquiera con un deep-link — el flag solo habilita la unidad de prueba
 * cuando además se la pide explícitamente por id.
 */
export function allowsTestUnit(requestedUnit: unknown, flagEnabled: boolean): boolean {
  return flagEnabled && typeof requestedUnit === "string" && isTestUnit(requestedUnit);
}

/**
 * El borde de más privilegio del dominio: decide si /reservas debe redirigir
 * a tarifas por estar el sitio en modo WhatsApp. Vive acá, separada de la
 * page, para que el caso puntual que la vuelve interesante —flag prendido
 * pero unidad pedida real— tenga un test directo e invocable. Sin esto, un
 * refactor que cambiara "las DOS condiciones" por "alcanza con el flag" (el
 * bug que allowsTestUnit entero viene a prevenir) podría colarse en la page
 * sin que ningún test lo note.
 */
export function shouldRedirectReservasToTarifas(
  requestedUnit: unknown,
  testUnitEnabled: boolean,
  bookingMode: BookingMode,
): boolean {
  return !allowsTestUnit(requestedUnit, testUnitEnabled) && isWhatsAppBookingMode(bookingMode);
}

export function resolveUnit(id: BookableUnitId): BookableUnit {
  if (isTestUnit(id)) return TEST_UNIT;
  const unit = getUnit(id);
  // Todos los llamadores validan el id antes de llegar acá (isUnitId /
  // allowsTestUnit), así que esto es un cinturón extra: si algún día no fuera
  // así, mejor un Error con nombre acá que un TypeError opaco más abajo
  // leyendo unit.specs de undefined.
  if (!unit) throw new Error(`resolveUnit: unidad desconocida "${id}"`);
  return unit as BookableUnit;
}

/**
 * Único lugar que decide cuánto sale una reserva. Lo usan el checkout (para
 * mostrar) y /api/payments (para cobrar); si divergieran, se tokeniza un
 * importe y se captura otro.
 */
export function checkoutTotal(
  s: RateSettings,
  method: PaymentMethod,
  unitId: BookableUnitId,
  nights: number,
): number {
  // Precio plano: no depende del método ni de las noches, a propósito — es
  // un cobro de prueba, no una estadía real que facturar por noche.
  if (isTestUnit(unitId)) return TEST_UNIT_TOTAL;
  return methodTotal(s, method, unitId, nights);
}

export function checkoutSavings(s: RateSettings, unitId: BookableUnitId, nights: number): number {
  // Sin ahorro por transferencia: la unidad de prueba es solo tarjeta.
  if (isTestUnit(unitId)) return 0;
  return transferSavings(s, unitId, nights);
}
