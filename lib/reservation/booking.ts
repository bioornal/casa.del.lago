import { addDays, differenceInCalendarDays } from "date-fns";

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_BOOKING_DAYS_AHEAD = 365;
export const MAX_BOOKING_NIGHTS = 60;

/** Date local → "YYYY-MM-DD" (sin corrimiento de TZ). */
export function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → Date local a medianoche (sin corrimiento de TZ). */
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Rechaza fechas imposibles que JavaScript normalizaría silenciosamente. */
export function isValidDateOnly(s: string): boolean {
  if (!DATE_ONLY_RE.test(s)) return false;
  const date = parseDateOnly(s);
  const [year, month, day] = s.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Límites server-side para evitar rangos pasados, imposibles o abusivos. */
export function validBookingRange(checkIn: string, checkOut: string, now = new Date()): boolean {
  if (!isValidDateOnly(checkIn) || !isValidDateOnly(checkOut)) return false;
  const from = parseDateOnly(checkIn);
  const to = parseDateOnly(checkOut);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nights = differenceInCalendarDays(to, from);
  return (
    from >= today &&
    nights > 0 &&
    nights <= MAX_BOOKING_NIGHTS &&
    from <= addDays(today, MAX_BOOKING_DAYS_AHEAD)
  );
}
