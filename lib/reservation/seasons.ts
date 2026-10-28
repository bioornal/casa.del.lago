import { formatDateOnly } from "./booking";

// Temporadas por rangos de fechas (editables en /admin/tarifas). Módulo puro:
// lo usan el checkout en el navegador y las rutas de cobro en el server, así
// que las dos puntas deciden igual a qué temporada pertenece cada noche.
//
// Una noche pertenece a la fecha en que EMPIEZA: con el rango 15/12 → 28/02,
// la noche del 28/02 es de alta y el check-out del 01/03 no cuenta.

export type Season = "low" | "high";
export type SeasonRange = { from: string; to: string }; // YYYY-MM-DD, ambos inclusive

export const MAX_SEASON_RANGES = 24;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDay(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function seasonOf(date: Date, ranges: readonly SeasonRange[]): Season {
  const day = formatDateOnly(date); // comparación lexicográfica YYYY-MM-DD
  return ranges.some((r) => r.from <= day && day <= r.to) ? "high" : "low";
}

export function nightSeasons(checkIn: Date, nights: number, ranges: readonly SeasonRange[]): Season[] {
  const out: Season[] = [];
  for (let i = 0; i < nights; i++) {
    out.push(seasonOf(new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() + i), ranges));
  }
  return out;
}

/** Valida y ordena los rangos. null si algo es inválido (formato, orden, superposición, cantidad). */
export function parseSeasonRanges(raw: unknown): SeasonRange[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_SEASON_RANGES) return null;
  const ranges: SeasonRange[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const { from, to } = r as Record<string, unknown>;
    if (typeof from !== "string" || typeof to !== "string") return null;
    if (!isRealDay(from) || !isRealDay(to) || from > to) return null;
    ranges.push({ from, to });
  }
  ranges.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].from <= ranges[i - 1].to) return null;
  }
  return ranges;
}
