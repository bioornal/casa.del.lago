import { differenceInCalendarDays, getDay } from "date-fns";
import { nightSeasons, seasonOf } from "./seasons";
import type { HighSeason } from "./rate-settings";

export const LOW_SEASON_WEEKDAY_MIN_NIGHTS = 2;
export const WEEKEND_PACKAGE_NIGHTS = 3;
export const WEEKEND_PACKAGE_BILLED_NIGHTS = 2.5;

/** Lo único de las tarifas que necesitan las reglas de estadía. RateSettings lo cumple. */
export type StaySettings = { high?: HighSeason };

/**
 * Mínimo de noches según la temporada del día de LLEGADA.
 * Baja: lunes a jueves 2 noches; viernes a domingo 3. Alta: el mínimo configurado.
 */
export function minimumNights(checkIn: Date, s: StaySettings = {}): number {
  if (s.high && seasonOf(checkIn, s.high.ranges) === "high") return s.high.minNights;
  const day = getDay(checkIn); // 0 domingo ... 6 sábado
  return day >= 5 || day === 0 ? WEEKEND_PACKAGE_NIGHTS : LOW_SEASON_WEEKDAY_MIN_NIGHTS;
}

/** Paquete de fin de semana: llegada viernes, exactamente 3 noches, todas de temporada baja. */
export function isWeekendPackage(checkIn: Date, nights: number, s: StaySettings = {}): boolean {
  if (getDay(checkIn) !== 5 || nights !== WEEKEND_PACKAGE_NIGHTS) return false;
  return nightSeasons(checkIn, nights, s.high?.ranges ?? []).every((season) => season === "low");
}

export function meetsStayMinimum(checkIn: Date, checkOut: Date, s: StaySettings = {}): boolean {
  return differenceInCalendarDays(checkOut, checkIn) >= minimumNights(checkIn, s);
}
