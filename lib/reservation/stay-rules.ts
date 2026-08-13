import { differenceInCalendarDays, getDay } from "date-fns";

export const LOW_SEASON_WEEKDAY_MIN_NIGHTS = 2;
export const WEEKEND_PACKAGE_NIGHTS = 3;
export const WEEKEND_PACKAGE_BILLED_NIGHTS = 2.5;

/** En temporada baja, lunes a jueves requieren al menos dos noches. */
export function minimumNights(checkIn: Date): number {
  const day = getDay(checkIn); // 0 domingo ... 6 sábado
  return day >= 5 || day === 0 ? WEEKEND_PACKAGE_NIGHTS : LOW_SEASON_WEEKDAY_MIN_NIGHTS;
}

/** Paquete clásico de fin de semana: llegada viernes y tres noches. */
export function isWeekendPackage(checkIn: Date, nights: number): boolean {
  return getDay(checkIn) === 5 && nights === WEEKEND_PACKAGE_NIGHTS;
}

/** Noches que se cobran; el paquete de fin de semana cobra 2,5 por 3 noches. */
export function billedNights(checkIn: Date | null, nights: number): number {
  return checkIn && isWeekendPackage(checkIn, nights) ? WEEKEND_PACKAGE_BILLED_NIGHTS : nights;
}

export function meetsStayMinimum(checkIn: Date, checkOut: Date): boolean {
  return differenceInCalendarDays(checkOut, checkIn) >= minimumNights(checkIn);
}
