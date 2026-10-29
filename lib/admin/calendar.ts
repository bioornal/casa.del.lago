// Lógica del calendario mensual del panel. Todo trabaja con fechas ISO
// (YYYY-MM-DD) como strings: se comparan bien en orden lexicográfico y no
// arrastran corrimientos de zona horaria entre el servidor (UTC) y Argentina.

export type MonthRef = { year: number; month: number }; // month 1–12
export type GridDay = { iso: string; day: number; inMonth: boolean };

type Stay = { unit_id: string; check_in: string; check_out: string };

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseMonth(raw: string | undefined, today: string): MonthRef {
  const m = raw ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) };
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
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
