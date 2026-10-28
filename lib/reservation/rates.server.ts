import { UNITS, type Unit } from "@/lib/units";
import { getAvailabilityServer } from "./availability.server";
import { getRateSettings } from "./rate-settings.server";
import { computeNights } from "./pricing";
import { methodRates, methodTotal, stayLines, transferSavings, type StayLine } from "./method-pricing";
import { parseDateOnly, formatDateOnly } from "./booking";
import { isWeekendPackage, meetsStayMinimum } from "./stay-rules";

// Los montos públicos son PRECIO DE LISTA = método tarjeta (comisión incluida,
// ver method-pricing.ts); transferTotal/savings alimentan la línea de ahorro.
export type UnitRate = {
  unit: Unit;
  available: boolean;
  nights: number;
  nightly: number; // precio de lista por noche del primer tramo
  lines: StayLine[]; // tramos por temporada; más de uno si la estadía cruza temporadas
  cleaningFee: number;
  total: number;
  transferTotal: number;
  savings: number;
  weekendPackage: boolean;
};

/** Para cada unidad: ¿libre [checkIn, checkOut)? + total del rango. Fail-open por unidad. */
export async function getRatesForRange(checkIn: string, checkOut: string, guests: number): Promise<UnitRate[]> {
  const from = parseDateOnly(checkIn);
  const to = parseDateOnly(checkOut);
  const nights = computeNights(from, to);
  const settings = await getRateSettings();
  const card = methodRates(settings, "card", guests);
  const stayValid = meetsStayMinimum(from, to, settings);

  return Promise.all(
    UNITS.map(async (unit): Promise<UnitRate> => {
      const lines = stayLines(settings, "card", unit.slug, nights, guests, from);
      const nightly = lines[0]?.nightly ?? card.nightly[unit.slug];
      const total = methodTotal(settings, "card", unit.slug, nights, guests, from);
      const transferTotal = methodTotal(settings, "transfer", unit.slug, nights, guests, from);
      const savings = transferSavings(settings, unit.slug, nights, guests, from);
      const base = {
        unit, nights, nightly, lines, cleaningFee: card.cleaningFee, total, transferTotal, savings,
        weekendPackage: isWeekendPackage(from, nights, settings),
      };
      if (nights <= 0 || !stayValid) return { ...base, available: false };
      const { disabledDates } = await getAvailabilityServer(unit.slug, { from, to });
      const busy = new Set(disabledDates.map(formatDateOnly));
      let available = true;
      for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
        if (busy.has(formatDateOnly(d))) {
          available = false;
          break;
        }
      }
      return { ...base, available };
    }),
  );
}
