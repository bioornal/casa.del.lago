// Lógica del calendario mensual del panel. Todo trabaja con fechas ISO
// (YYYY-MM-DD) como strings: se comparan bien en orden lexicográfico y no
// arrastran corrimientos de zona horaria entre el servidor (UTC) y Argentina.

export type MonthRef = { year: number; month: number }; // month 1–12
export type GridDay = { iso: string; day: number; inMonth: boolean };

type Stay = { unit_id: string; check_in: string; check_out: string };

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function parseMonth(raw: string | undefined, today: string): MonthRef {
  const m = raw ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) };
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addMonthsToRef({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function getMonthsSequence(startRef: MonthRef, count: number): MonthRef[] {
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, i) => addMonthsToRef(startRef, i));
}

export function formatMonthRange(months: MonthRef[]): string {
  if (months.length === 0) return "";
  if (months.length === 1) {
    return `${MONTHS_ES[months[0].month - 1]} ${months[0].year}`;
  }
  const first = months[0];
  const last = months[months.length - 1];
  if (first.year === last.year) {
    return `${MONTHS_ES[first.month - 1]} – ${MONTHS_ES[last.month - 1]} ${first.year}`;
  }
  return `${MONTHS_ES[first.month - 1]} ${first.year} – ${MONTHS_ES[last.month - 1]} ${last.year}`;
}

/** Semanas (lunes a domingo) que cubren el mes, con días de relleno a los costados. */
export function monthGrid(year: number, month: number): GridDay[][] {
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const cur = new Date(year, month - 1, 1 - offset);
  return Array.from({ length: Math.ceil((offset + daysInMonth) / 7) }, () =>
    Array.from({ length: 7 }, () => {
      const day = { iso: isoOf(cur), day: cur.getDate(), inMonth: cur.getMonth() === month - 1 };
      cur.setDate(cur.getDate() + 1);
      return day;
    }),
  );
}

const nextIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return isoOf(new Date(y, m - 1, d + 1));
};

/**
 * Reserva que ocupa la NOCHE de `iso` en esa cabaña (check-in inclusive,
 * check-out exclusivo), con las puntas marcadas para dibujar la barra.
 */
export function occupiedNight<T extends Stay>(
  stays: T[],
  unitId: string,
  iso: string,
): (T & { start: boolean; end: boolean }) | null {
  const r = stays.find((s) => s.unit_id === unitId && s.check_in <= iso && iso < s.check_out);
  if (!r) return null;
  return { ...r, start: r.check_in === iso, end: nextIso(iso) === r.check_out };
}

/** Para la agenda de un día: incluye el día de salida (hay que despedir al huésped). */
export function overlapsDay(s: Stay, iso: string): boolean {
  return s.check_in <= iso && iso <= s.check_out;
}

/** Noches ocupadas por cabaña dentro del mes. */
export function monthOccupancy(stays: Stay[], year: number, month: number): { nights: number; byUnit: Record<string, number> } {
  const nights = new Date(year, month, 0).getDate();
  const from = `${year}-${pad(month)}-01`;
  const to = `${year}-${pad(month)}-${pad(nights)}`;
  const byUnit: Record<string, number> = {};
  for (const s of stays) {
    let iso = s.check_in < from ? from : s.check_in;
    while (iso < s.check_out && iso <= to) {
      byUnit[s.unit_id] = (byUnit[s.unit_id] ?? 0) + 1;
      iso = nextIso(iso);
    }
  }
  return { nights, byUnit };
}

/** Noches ocupadas combinadas en un rango de meses. */
export function rangeOccupancy(
  stays: Stay[],
  months: MonthRef[],
): { nights: number; byUnit: Record<string, number> } {
  let totalNights = 0;
  const byUnit: Record<string, number> = {};
  for (const m of months) {
    const occ = monthOccupancy(stays, m.year, m.month);
    totalNights += occ.nights;
    for (const [unitId, n] of Object.entries(occ.byUnit)) {
      byUnit[unitId] = (byUnit[unitId] ?? 0) + n;
    }
  }
  return { nights: totalNights, byUnit };
}

/** Devuelve las fechas extremas [fromIso, toIso] que cubren las semanas de todos los meses dados. */
export function multiMonthDateBounds(months: MonthRef[]): { fromIso: string; toIso: string } {
  if (months.length === 0) throw new Error("months must not be empty");
  const firstGrid = monthGrid(months[0].year, months[0].month);
  const last = months[months.length - 1];
  const lastGrid = monthGrid(last.year, last.month);
  return {
    fromIso: firstGrid[0][0].iso,
    toIso: lastGrid[lastGrid.length - 1][6].iso,
  };
}
