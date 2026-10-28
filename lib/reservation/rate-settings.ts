import { UNITS, CLEANING_FEE, BASE_GUESTS, EXTRA_GUEST_FEE, type UnitSlug } from "@/lib/units";
import { parseSeasonRanges, type SeasonRange } from "./seasons";

/** Temporada alta: precio neto por noche propio, mínimo propio y rangos de fechas. */
export type HighSeason = {
  nightly: Record<UnitSlug, number>;
  minNights: number;
  ranges: SeasonRange[];
};

/** Reglas de estadía de temporada baja (editables en /admin/tarifas). */
export type LowSeasonRules = {
  /** Mínimo de noches con llegada de lunes a jueves. */
  weekdayMinNights: number;
  /** Mínimo de noches con llegada de viernes a domingo. */
  weekendMinNights: number;
  /** Paquete de fin de semana: llegada viernes, exactamente `packageNights`, se cobran `packageBilledNights`. */
  packageEnabled: boolean;
  packageNights: number;
  packageBilledNights: number;
};

export const DEFAULT_LOW_RULES: LowSeasonRules = {
  weekdayMinNights: 2,
  weekendMinNights: 3,
  packageEnabled: true,
  packageNights: 3,
  packageBilledNights: 2.5,
};

// Tarifas editables desde /admin/tarifas. Viven en Supabase (tabla rate_settings);
// este módulo es la forma compartida (server + cliente + tests, sin imports de server).
//
// El precio configurado es la tarifa neta base para `baseGuests`; `extraGuestFee`
// se suma por cada huésped adicional.
export type RateSettings = {
  nightly: Record<UnitSlug, number>;
  cleaningFee: number;
  baseGuests: number;
  extraGuestFee: number;
  /** Comisión % del cobro con tarjeta (MP). Los precios públicos la incluyen (ver method-pricing.ts). */
  cardFeePct: number;
  /** Costo % del cobro por transferencia (retención IIBB). */
  transferFeePct: number;
  /** Ausente = no hay temporada alta configurada: todo se cobra como baja. */
  high?: HighSeason;
  /** Ausente = reglas de baja por defecto (DEFAULT_LOW_RULES). */
  low?: LowSeasonRules;
};

// Fallback si la DB no responde o aún no se corrió el SQL: valores de temporada
// baja → el sitio nunca rompe.
export const DEFAULT_RATE_SETTINGS: RateSettings = {
  nightly: {
    aratiri: UNITS.find((u) => u.slug === "aratiri")!.price,
    aguaribay: UNITS.find((u) => u.slug === "aguaribay")!.price,
  },
  cleaningFee: CLEANING_FEE,
  baseGuests: BASE_GUESTS,
  extraGuestFee: EXTRA_GUEST_FEE,
  cardFeePct: 7.7,
  transferFeePct: 5,
};

// ---- Fila de Supabase ↔ RateSettings -------------------------------------

export type RateSettingsRow = {
  nightly_aratiri: number;
  nightly_aguaribay: number;
  cleaning_fee: number;
  base_guests: number;
  extra_guest_fee: number;
  // Pueden faltar si aún no se corrió el ALTER de setup.sql en Supabase.
  card_fee_pct?: number | string | null;
  transfer_fee_pct?: number | string | null;
  // Temporada alta. Pueden faltar si aún no se corrió el ALTER de setup.sql.
  high_nightly_aratiri?: number | null;
  high_nightly_aguaribay?: number | null;
  high_min_nights?: number | null;
  high_season_ranges?: unknown;
  // Reglas de baja. Pueden faltar si aún no se corrió el ALTER de setup.sql.
  low_weekday_min_nights?: number | null;
  low_weekend_min_nights?: number | null;
  weekend_package_enabled?: boolean | null;
  weekend_package_nights?: number | null;
  weekend_package_billed?: number | string | null;
};

/** numeric de Postgres puede llegar como string; ausente/int inválido → default. */
function parsePct(v: number | string | null | undefined, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 30 ? n : fallback;
}

const isPosInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

function rowHigh(row: RateSettingsRow): HighSeason | undefined {
  const { high_nightly_aratiri: a, high_nightly_aguaribay: b, high_min_nights: m } = row;
  if (!isPosInt(a) || !isPosInt(b) || !isPosInt(m) || m > 30) return undefined;
  return {
    nightly: { aratiri: a, aguaribay: b },
    minNights: m,
    // Un JSON roto en la fila no tumba el sitio: se ignora y todo queda en baja.
    ranges: parseSeasonRanges(row.high_season_ranges) ?? [],
  };
}

/** Noches cobradas del paquete: múltiplo de 0,5, mayor a 0 y no más que las noches del paquete. */
const isBilled = (billed: number, nights: number) =>
  Number.isFinite(billed) && billed > 0 && billed <= nights && Number.isInteger(billed * 2);

function rowLow(row: RateSettingsRow): LowSeasonRules | undefined {
  const { low_weekday_min_nights: wd, low_weekend_min_nights: we, weekend_package_nights: pn } = row;
  const billed = typeof row.weekend_package_billed === "string" ? Number(row.weekend_package_billed) : row.weekend_package_billed;
  if (!isPosInt(wd) || !isPosInt(we) || !isPosInt(pn) || wd > 30 || we > 30 || pn > 30) return undefined;
  if (typeof row.weekend_package_enabled !== "boolean" || typeof billed !== "number" || !isBilled(billed, pn)) return undefined;
  return {
    weekdayMinNights: wd,
    weekendMinNights: we,
    packageEnabled: row.weekend_package_enabled,
    packageNights: pn,
    packageBilledNights: billed,
  };
}

export function rowToSettings(row: RateSettingsRow): RateSettings {
  const cardFeePct = parsePct(row.card_fee_pct, DEFAULT_RATE_SETTINGS.cardFeePct);
  // priceBreakdown (method-pricing.ts) deriva el precio de lista SIEMPRE del
  // método tarjeta y presenta la transferencia como línea de descuento: si
  // transferFeePct superara a cardFeePct, las líneas mostradas dejarían de
  // sumar el Total. parseRateSettingsInput ya rechaza esa combinación cuando
  // se guarda desde /admin/tarifas, pero esta función lee lo que sea que haya
  // en la fila — incluida una editada a mano en SQL — y también arma la
  // inversión sola: alcanza con que card_fee_pct quede fuera de 0–30 (parsePct
  // cae al default 7,7 más abajo) mientras transfer_fee_pct guarda un valor
  // válido y mayor. Clampeamos acá, en la lectura, para que el invariante
  // valga siempre, sin importar cómo llegó la fila.
  const transferFeePct = Math.min(
    parsePct(row.transfer_fee_pct, DEFAULT_RATE_SETTINGS.transferFeePct),
    cardFeePct,
  );
  const high = rowHigh(row);
  const low = rowLow(row);
  return {
    nightly: {
      aratiri: row.nightly_aratiri,
      aguaribay: row.nightly_aguaribay,
    },
    cleaningFee: row.cleaning_fee,
    baseGuests: row.base_guests,
    extraGuestFee: row.extra_guest_fee,
    cardFeePct,
    transferFeePct,
    ...(high ? { high } : {}),
    ...(low ? { low } : {}),
  };
}

export function settingsToRow(s: RateSettings): RateSettingsRow {
  return {
    nightly_aratiri: s.nightly.aratiri,
    nightly_aguaribay: s.nightly.aguaribay,
    cleaning_fee: s.cleaningFee,
    base_guests: s.baseGuests,
    extra_guest_fee: s.extraGuestFee,
    card_fee_pct: s.cardFeePct,
    transfer_fee_pct: s.transferFeePct,
    ...(s.high
      ? {
          high_nightly_aratiri: s.high.nightly.aratiri,
          high_nightly_aguaribay: s.high.nightly.aguaribay,
          high_min_nights: s.high.minNights,
          high_season_ranges: s.high.ranges,
        }
      : {}),
    ...(s.low
      ? {
          low_weekday_min_nights: s.low.weekdayMinNights,
          low_weekend_min_nights: s.low.weekendMinNights,
          weekend_package_enabled: s.low.packageEnabled,
          weekend_package_nights: s.low.packageNights,
          weekend_package_billed: s.low.packageBilledNights,
        }
      : {}),
  };
}

// ---- Validación de la entrada del formulario admin -------------------------

const MAX_ARS = 100_000_000; // techo anti-tipeo (100 palos)

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 0 || n > MAX_ARS) return null;
  return n;
}

type BaseInputKey =
  | "nightly_aratiri"
  | "nightly_aguaribay"
  | "cleaning_fee"
  | "base_guests"
  | "extra_guest_fee"
  | "card_fee_pct"
  | "transfer_fee_pct";
const HIGH_INPUT_KEYS = [
  "high_nightly_aratiri",
  "high_nightly_aguaribay",
  "high_min_nights",
  "high_season_ranges",
] as const;
type HighInputKey = (typeof HIGH_INPUT_KEYS)[number];
const LOW_INPUT_KEYS = [
  "low_weekday_min_nights",
  "low_weekend_min_nights",
  "weekend_package_enabled",
  "weekend_package_nights",
  "weekend_package_billed",
] as const;
type LowInputKey = (typeof LOW_INPUT_KEYS)[number];

/**
 * Campos del form de /admin/tarifas. Los de alta y los de reglas de baja son
 * opcionales: sin ellos no se toca ese bloque.
 */
export type RateSettingsInput = Record<BaseInputKey, string> &
  Partial<Record<HighInputKey, string>> &
  Partial<Record<LowInputKey, string>>;

const nightsOf = (raw: string | undefined): number | null => {
  const n = Number((raw ?? "").trim());
  return (raw ?? "").trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 30 ? n : null;
};

function parseLowInput(raw: RateSettingsInput): { ok: true; value: LowSeasonRules } | { ok: false; error: string } {
  const weekdayMinNights = nightsOf(raw.low_weekday_min_nights);
  if (weekdayMinNights === null) {
    return { ok: false, error: "La estadía mínima de lunes a jueves debe ser un entero entre 1 y 30 noches." };
  }
  const weekendMinNights = nightsOf(raw.low_weekend_min_nights);
  if (weekendMinNights === null) {
    return { ok: false, error: "La estadía mínima de viernes a domingo debe ser un entero entre 1 y 30 noches." };
  }
  const packageEnabled = raw.weekend_package_enabled === "true";
  const packageNights = nightsOf(raw.weekend_package_nights);
  if (packageNights === null) {
    return { ok: false, error: "Las noches del paquete de fin de semana deben ser un entero entre 1 y 30." };
  }
  const billedRaw = (raw.weekend_package_billed ?? "").trim();
  const packageBilledNights = billedRaw === "" ? NaN : Number(billedRaw.replace(",", "."));
  if (!isBilled(packageBilledNights, packageNights)) {
    return {
      ok: false,
      error: "Las noches que se cobran en el paquete de fin de semana deben ser enteras o con media (ej. 2,5), y no más que las noches del paquete.",
    };
  }
  return { ok: true, value: { weekdayMinNights, weekendMinNights, packageEnabled, packageNights, packageBilledNights } };
}

/** % con hasta 2 decimales entre 0 y 30 (acepta coma o punto). */
function parsePctInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null; // Number("") === 0: el vacío NO es 0%
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 30) return null;
  return Math.round(n * 100) / 100;
}

/** Valida los campos del form de /admin/tarifas. Devuelve error legible o el valor listo para guardar. */
export function parseRateSettingsInput(
  raw: RateSettingsInput,
): { ok: true; value: RateSettings } | { ok: false; error: string } {
  const nightly: Record<UnitSlug, number> = { aratiri: 0, aguaribay: 0 };
  for (const slug of ["aratiri", "aguaribay"] as const) {
    const n = parseMoney(raw[`nightly_${slug}`]);
    if (n === null || n === 0) return { ok: false, error: "El precio por noche debe ser un entero mayor a 0." };
    nightly[slug] = n;
  }
  const cleaningFee = parseMoney(raw.cleaning_fee);
  if (cleaningFee === null) return { ok: false, error: "La tasa de limpieza debe ser un entero mayor o igual a 0." };
  const extraGuestFee = parseMoney(raw.extra_guest_fee);
  if (extraGuestFee === null) return { ok: false, error: "El cargo por huésped extra debe ser un entero mayor o igual a 0." };
  const baseGuests = Number(raw.base_guests.trim());
  if (!Number.isInteger(baseGuests) || baseGuests < 1 || baseGuests > 20) {
    return { ok: false, error: "Los huéspedes incluidos deben ser un entero entre 1 y 20." };
  }
  const cardFeePct = parsePctInput(raw.card_fee_pct);
  if (cardFeePct === null) return { ok: false, error: "La comisión de tarjeta debe ser un % entre 0 y 30." };
  const transferFeePct = parsePctInput(raw.transfer_fee_pct);
  if (transferFeePct === null) return { ok: false, error: "El costo de transferencia debe ser un % entre 0 y 30." };
  // El desglose del checkout (priceBreakdown, en method-pricing.ts) deriva el
  // precio de lista SIEMPRE del método tarjeta y presenta la transferencia como
  // línea de descuento. Si la transferencia costara más que la tarjeta, ese
  // descuento no existiría (queda clampeado en 0) y las líneas mostradas
  // dejarían de sumar el total cobrado. Se corta acá, donde entra el dato.
  if (transferFeePct > cardFeePct) {
    return {
      ok: false,
      error: "El costo de transferencia no puede ser mayor que la comisión de tarjeta: la transferencia tiene que seguir siendo la opción más barata.",
    };
  }
  const value: RateSettings = { nightly, cleaningFee, baseGuests, extraGuestFee, cardFeePct, transferFeePct };

  if (HIGH_INPUT_KEYS.some((k) => raw[k] !== undefined)) {
    const highNightly: Record<UnitSlug, number> = { aratiri: 0, aguaribay: 0 };
    for (const slug of ["aratiri", "aguaribay"] as const) {
      const n = parseMoney(raw[`high_nightly_${slug}`] ?? "");
      if (n === null || n === 0) {
        return { ok: false, error: "El precio por noche de temporada alta debe ser un entero mayor a 0." };
      }
      highNightly[slug] = n;
    }
    const minNights = Number((raw.high_min_nights ?? "").trim());
    if (!Number.isInteger(minNights) || minNights < 1 || minNights > 30) {
      return { ok: false, error: "La estadía mínima de temporada alta debe ser un entero entre 1 y 30." };
    }
    let json: unknown;
    try {
      json = JSON.parse(raw.high_season_ranges ?? "[]");
    } catch {
      return { ok: false, error: "No se pudieron leer las fechas de temporada alta." };
    }
    const ranges = parseSeasonRanges(json);
    if (!ranges) {
      return {
        ok: false,
        error: "Las fechas de temporada alta son inválidas: cada rango necesita desde ≤ hasta y no pueden superponerse.",
      };
    }
    value.high = { nightly: highNightly, minNights, ranges };
  }

  if (LOW_INPUT_KEYS.some((k) => raw[k] !== undefined)) {
    const low = parseLowInput(raw);
    if (!low.ok) return low;
    value.low = low.value;
  }

  return { ok: true, value };
}
