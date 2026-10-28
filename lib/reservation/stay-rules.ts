import { differenceInCalendarDays, getDay } from "date-fns";
import { nightSeasons, seasonOf } from "./seasons";
import { DEFAULT_LOW_RULES, type HighSeason, type LowSeasonRules } from "./rate-settings";

/** Lo único de las tarifas que necesitan las reglas de estadía. RateSettings lo cumple. */
export type StaySettings = { high?: HighSeason; low?: LowSeasonRules };

/** Reglas de baja vigentes: las configuradas en /admin/tarifas o las de fábrica. */
export const lowRules = (s: StaySettings = {}): LowSeasonRules => s.low ?? DEFAULT_LOW_RULES;

/**
 * Mínimo de noches según la temporada del día de LLEGADA.
 * Baja: uno para lunes a jueves y otro para viernes a domingo. Alta: el mínimo configurado.
 */
export function minimumNights(checkIn: Date, s: StaySettings = {}): number {
  if (s.high && seasonOf(checkIn, s.high.ranges) === "high") return s.high.minNights;
  const low = lowRules(s);
  const day = getDay(checkIn); // 0 domingo ... 6 sábado
  return day >= 5 || day === 0 ? low.weekendMinNights : low.weekdayMinNights;
}

/** Paquete de fin de semana: activo, llegada viernes, exactamente las noches del paquete, todas de baja. */
export function isWeekendPackage(checkIn: Date, nights: number, s: StaySettings = {}): boolean {
  const low = lowRules(s);
  if (!low.packageEnabled || getDay(checkIn) !== 5 || nights !== low.packageNights) return false;
  return nightSeasons(checkIn, nights, s.high?.ranges ?? []).every((season) => season === "low");
}

export function meetsStayMinimum(checkIn: Date, checkOut: Date, s: StaySettings = {}): boolean {
  return differenceInCalendarDays(checkOut, checkIn) >= minimumNights(checkIn, s);
}
