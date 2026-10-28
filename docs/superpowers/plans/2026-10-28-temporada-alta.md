# Temporada alta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una temporada alta por rangos de fechas editables, con precio por noche propio por cabaña, mínimo de noches propio y sin la promo 3×2,5.

**Architecture:** Un módulo puro nuevo (`seasons.ts`) decide a qué temporada pertenece cada noche. `RateSettings` suma un bloque opcional `high`; si falta, todo se comporta como hoy. `stay-rules` y `method-pricing` lo consultan, y como todos los consumidores (checkout, rutas de cobro, tarifas) ya pasan por `methodTotal`, lo mostrado y lo cobrado siguen coincidiendo.

**Tech Stack:** Next.js 16 · TypeScript · Vitest · Supabase (Postgres) · next-intl.

**Spec:** `docs/superpowers/specs/2026-10-28-temporada-alta-design.md`

## Global Constraints

- Una noche pertenece a la fecha en que empieza; es de alta si `from <= fecha <= to` para algún rango (inclusive).
- Promo 3×2,5 solo con llegada viernes, exactamente 3 noches y las 3 en baja.
- Mínimo de noches: según la temporada del día de llegada. Baja: lun–jue 2, vie–dom 3. Alta: `high.minNights` (1–30).
- Limpieza, huésped extra, huéspedes base y comisiones son compartidos entre temporadas.
- `RateSettings.high` es opcional: ausente = sin temporada alta (comportamiento actual).
- Valores de ejemplo: alta $149.800 neto por noche en ambas cabañas, mínimo 4 noches, rango sembrado solo en la base en vivo: `2026-12-15 → 2027-02-28`.
- Comandos: `pnpm test` (vitest), `pnpm exec tsc` (typecheck). Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Módulo `seasons`

**Files:**
- Create: `lib/reservation/seasons.ts`
- Test: `tests/reservation/seasons.test.ts`

**Interfaces:**
- Consumes: `formatDateOnly(d: Date): string` de `lib/reservation/booking.ts`.
- Produces: `type Season = "low" | "high"`, `type SeasonRange = { from: string; to: string }`, `MAX_SEASON_RANGES = 24`, `seasonOf(date, ranges): Season`, `nightSeasons(checkIn, nights, ranges): Season[]`, `parseSeasonRanges(raw: unknown): SeasonRange[] | null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { seasonOf, nightSeasons, parseSeasonRanges, MAX_SEASON_RANGES } from "@/lib/reservation/seasons";

const RANGES = [{ from: "2026-12-15", to: "2027-02-28" }];

describe("seasonOf", () => {
  it("los bordes del rango son de alta (inclusive)", () => {
    expect(seasonOf(new Date(2026, 11, 15), RANGES)).toBe("high");
    expect(seasonOf(new Date(2027, 1, 28), RANGES)).toBe("high");
  });
  it("el día anterior y el siguiente son de baja", () => {
    expect(seasonOf(new Date(2026, 11, 14), RANGES)).toBe("low");
    expect(seasonOf(new Date(2027, 2, 1), RANGES)).toBe("low");
  });
  it("sin rangos todo es baja", () => {
    expect(seasonOf(new Date(2027, 0, 10), [])).toBe("low");
  });
});

describe("nightSeasons", () => {
  it("una entrada por noche, cruzando el inicio del rango", () => {
    expect(nightSeasons(new Date(2026, 11, 13), 4, RANGES)).toEqual(["low", "low", "high", "high"]);
  });
  it("0 noches → lista vacía", () => {
    expect(nightSeasons(new Date(2026, 11, 13), 0, RANGES)).toEqual([]);
  });
});

describe("parseSeasonRanges", () => {
  it("acepta y ordena por fecha de inicio", () => {
    expect(
      parseSeasonRanges([
        { from: "2027-07-10", to: "2027-07-25" },
        { from: "2026-12-15", to: "2027-02-28" },
      ]),
    ).toEqual([
      { from: "2026-12-15", to: "2027-02-28" },
      { from: "2027-07-10", to: "2027-07-25" },
    ]);
  });
  it("lista vacía es válida", () => {
    expect(parseSeasonRanges([])).toEqual([]);
  });
  it("rechaza desde > hasta, fechas inválidas, superposición y no-listas", () => {
    expect(parseSeasonRanges([{ from: "2027-01-10", to: "2027-01-05" }])).toBeNull();
    expect(parseSeasonRanges([{ from: "2027-02-30", to: "2027-03-05" }])).toBeNull();
    expect(parseSeasonRanges([{ from: "15/12/2026", to: "2027-01-05" }])).toBeNull();
    expect(
      parseSeasonRanges([
        { from: "2026-12-15", to: "2027-01-10" },
        { from: "2027-01-10", to: "2027-01-20" },
      ]),
    ).toBeNull();
    expect(parseSeasonRanges("nope")).toBeNull();
    expect(parseSeasonRanges([null])).toBeNull();
  });
  it("rechaza más del máximo de rangos", () => {
    const many = Array.from({ length: MAX_SEASON_RANGES + 1 }, (_, i) => {
      const d = `2030-01-${String(i + 1).padStart(2, "0")}`;
      return { from: d, to: d };
    });
    expect(parseSeasonRanges(many)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/reservation/seasons.test.ts`
Expected: FAIL, no se puede resolver `@/lib/reservation/seasons`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/reservation/seasons.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation/seasons.ts tests/reservation/seasons.test.ts
git commit -m "feat(tarifas): módulo de temporadas por rangos de fechas"
```

---

### Task 2: `RateSettings.high` + esquema

**Files:**
- Modify: `lib/reservation/rate-settings.ts`
- Modify: `supabase/setup.sql` (bloque al final)
- Test: `tests/reservation/rate-settings.test.ts`

**Interfaces:**
- Consumes: `SeasonRange`, `parseSeasonRanges` (Task 1).
- Produces: `type HighSeason = { nightly: Record<UnitSlug, number>; minNights: number; ranges: SeasonRange[] }`; `RateSettings.high?: HighSeason`; `RateSettingsRow` con `high_nightly_aratiri?`, `high_nightly_aguaribay?`, `high_min_nights?`, `high_season_ranges?`; `RateSettingsInput` con esas 4 claves opcionales como string (`high_season_ranges` = JSON).

- [ ] **Step 1: Write the failing tests** (agregar al final de `tests/reservation/rate-settings.test.ts`)

```ts
describe("temporada alta en rate_settings", () => {
  const BASE_ROW = {
    nightly_aratiri: 99800,
    nightly_aguaribay: 99800,
    cleaning_fee: 30000,
    base_guests: 2,
    extra_guest_fee: 20000,
    card_fee_pct: 7.7,
    transfer_fee_pct: 5,
  };

  it("sin columnas de alta → sin bloque high (comportamiento actual)", () => {
    expect(rowToSettings(BASE_ROW).high).toBeUndefined();
  });

  it("lee precios, mínimo y rangos de alta", () => {
    const s = rowToSettings({
      ...BASE_ROW,
      high_nightly_aratiri: 149800,
      high_nightly_aguaribay: 139800,
      high_min_nights: 4,
      high_season_ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
    });
    expect(s.high).toEqual({
      nightly: { aratiri: 149800, aguaribay: 139800 },
      minNights: 4,
      ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
    });
  });

  it("rangos inválidos en la fila → lista vacía, no rompe", () => {
    const s = rowToSettings({
      ...BASE_ROW,
      high_nightly_aratiri: 149800,
      high_nightly_aguaribay: 149800,
      high_min_nights: 4,
      high_season_ranges: "basura",
    });
    expect(s.high?.ranges).toEqual([]);
  });

  it("settingsToRow escribe las columnas de alta", () => {
    const s = rowToSettings({
      ...BASE_ROW,
      high_nightly_aratiri: 149800,
      high_nightly_aguaribay: 149800,
      high_min_nights: 4,
      high_season_ranges: [],
    });
    expect(settingsToRow(s)).toMatchObject({
      high_nightly_aratiri: 149800,
      high_nightly_aguaribay: 149800,
      high_min_nights: 4,
      high_season_ranges: [],
    });
  });

  const HIGH_INPUT = {
    ...VALID,
    high_nightly_aratiri: "149800",
    high_nightly_aguaribay: "149800",
    high_min_nights: "4",
    high_season_ranges: JSON.stringify([{ from: "2026-12-15", to: "2027-02-28" }]),
  };

  it("parseRateSettingsInput acepta el bloque de alta", () => {
    const r = parseRateSettingsInput(HIGH_INPUT);
    expect(r.ok && r.value.high).toEqual({
      nightly: { aratiri: 149800, aguaribay: 149800 },
      minNights: 4,
      ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
    });
  });

  it("parseRateSettingsInput rechaza cada campo de alta inválido", () => {
    expect(parseRateSettingsInput({ ...HIGH_INPUT, high_nightly_aratiri: "0" }).ok).toBe(false);
    expect(parseRateSettingsInput({ ...HIGH_INPUT, high_min_nights: "0" }).ok).toBe(false);
    expect(parseRateSettingsInput({ ...HIGH_INPUT, high_min_nights: "31" }).ok).toBe(false);
    expect(parseRateSettingsInput({ ...HIGH_INPUT, high_season_ranges: "{" }).ok).toBe(false);
    expect(
      parseRateSettingsInput({
        ...HIGH_INPUT,
        high_season_ranges: JSON.stringify([{ from: "2027-01-10", to: "2027-01-01" }]),
      }).ok,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/reservation/rate-settings.test.ts`
Expected: FAIL (`high` indefinido / claves desconocidas).

- [ ] **Step 3: Implementation** en `lib/reservation/rate-settings.ts`

Agregar imports y tipos:

```ts
import { parseSeasonRanges, type SeasonRange } from "./seasons";

/** Temporada alta: precio neto por noche propio, mínimo propio y rangos de fechas. */
export type HighSeason = {
  nightly: Record<UnitSlug, number>;
  minNights: number;
  ranges: SeasonRange[];
};
```

En `RateSettings` agregar al final:

```ts
  /** Ausente = no hay temporada alta configurada: todo se cobra como baja. */
  high?: HighSeason;
```

En `RateSettingsRow` agregar al final:

```ts
  // Temporada alta. Pueden faltar si aún no se corrió el ALTER de setup.sql.
  high_nightly_aratiri?: number | null;
  high_nightly_aguaribay?: number | null;
  high_min_nights?: number | null;
  high_season_ranges?: unknown;
```

Antes de `rowToSettings`:

```ts
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
```

En el `return` de `rowToSettings` reemplazar el objeto por:

```ts
  const high = rowHigh(row);
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
  };
```

En `settingsToRow` agregar al final del objeto:

```ts
    ...(s.high
      ? {
          high_nightly_aratiri: s.high.nightly.aratiri,
          high_nightly_aguaribay: s.high.nightly.aguaribay,
          high_min_nights: s.high.minNights,
          high_season_ranges: s.high.ranges,
        }
      : {}),
```

Reemplazar la definición de `RateSettingsInput`:

```ts
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

/** Campos del form de /admin/tarifas. Los de alta son opcionales: sin ellos no se toca la temporada alta. */
export type RateSettingsInput = Record<BaseInputKey, string> & Partial<Record<HighInputKey, string>>;
```

En `parseRateSettingsInput`, reemplazar el `return { ok: true, … }` final por:

```ts
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

  return { ok: true, value };
```

- [ ] **Step 4: Agregar el bloque a `supabase/setup.sql`** (al final del archivo)

```sql

-- =============================================================
-- 2026-10-28 — Temporada alta (ver lib/reservation/seasons.ts).
-- Rangos [{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }], ambos inclusive.
-- Lista vacía = sin temporada alta: todo se cobra como baja.
-- =============================================================
alter table public.rate_settings
  add column if not exists high_nightly_aratiri integer not null default 149800
    check (high_nightly_aratiri > 0),
  add column if not exists high_nightly_aguaribay integer not null default 149800
    check (high_nightly_aguaribay > 0),
  add column if not exists high_min_nights integer not null default 4
    check (high_min_nights between 1 and 30),
  add column if not exists high_season_ranges jsonb not null default '[]'::jsonb;
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run tests/reservation/rate-settings.test.ts && pnpm exec tsc --noEmit`
Expected: PASS y typecheck limpio.

- [ ] **Step 6: Commit**

```bash
git add lib/reservation/rate-settings.ts supabase/setup.sql tests/reservation/rate-settings.test.ts
git commit -m "feat(tarifas): bloque de temporada alta en rate_settings"
```

---

### Task 3: Reglas de estadía según temporada

**Files:**
- Modify: `lib/reservation/stay-rules.ts`
- Test: `tests/reservation/stay-rules.test.ts`

**Interfaces:**
- Consumes: `seasonOf`, `nightSeasons` (Task 1); `HighSeason` (Task 2).
- Produces: `type StaySettings = { high?: HighSeason }`; `minimumNights(checkIn, s?: StaySettings)`; `isWeekendPackage(checkIn, nights, s?: StaySettings)`; `meetsStayMinimum(checkIn, checkOut, s?: StaySettings)`. Se elimina `billedNights` (lo reemplaza `stayLines` en Task 4). `RateSettings` cumple `StaySettings`, así que se pasa entero.

- [ ] **Step 1: Write the failing tests** (agregar en `tests/reservation/stay-rules.test.ts`)

```ts
const HIGH = {
  high: {
    nightly: { aratiri: 149800, aguaribay: 149800 },
    minNights: 4,
    ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
  },
};

describe("stay rules con temporada alta", () => {
  it("con llegada en alta rige el mínimo de alta, cualquier día", () => {
    const tuesday = new Date(2027, 0, 12);
    const friday = new Date(2027, 0, 15);
    expect(minimumNights(tuesday, HIGH)).toBe(4);
    expect(minimumNights(friday, HIGH)).toBe(4);
    expect(meetsStayMinimum(friday, new Date(2027, 0, 18), HIGH)).toBe(false);
    expect(meetsStayMinimum(friday, new Date(2027, 0, 19), HIGH)).toBe(true);
  });

  it("con llegada en baja rige la regla de baja aunque haya alta configurada", () => {
    const monday = new Date(2026, 10, 2);
    expect(minimumNights(monday, HIGH)).toBe(2);
  });

  it("la promo no aplica si alguna de las 3 noches es de alta", () => {
    expect(isWeekendPackage(new Date(2026, 11, 11), 3, HIGH)).toBe(true); // vie 11/12: noches 11–13, baja
    expect(isWeekendPackage(new Date(2027, 0, 15), 3, HIGH)).toBe(false); // vie 15/1: dentro de alta
  });

  it("la promo no aplica si la estadía cruza al inicio de la alta", () => {
    const highFromSunday = { high: { ...HIGH.high, ranges: [{ from: "2026-12-13", to: "2027-02-28" }] } };
    const friday = new Date(2026, 11, 11); // noches 11 y 12 baja, 13 alta
    expect(isWeekendPackage(friday, 3, highFromSunday)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/reservation/stay-rules.test.ts`
Expected: FAIL (el mínimo de alta no existe todavía).

- [ ] **Step 3: Implementation** — reemplazar `lib/reservation/stay-rules.ts` por:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run tests/reservation/stay-rules.test.ts`
Expected: PASS. (`method-pricing.ts` todavía importa `billedNights`: se corrige en Task 4, no correr `tsc` acá.)

- [ ] **Step 5: Commit** (junto con Task 4, para no dejar el árbol sin compilar)

---

### Task 4: Precio por noche según temporada

**Files:**
- Modify: `lib/reservation/method-pricing.ts`
- Test: `tests/reservation/method-pricing.test.ts`

**Interfaces:**
- Consumes: `nightSeasons`, `Season` (Task 1); `isWeekendPackage`, `WEEKEND_PACKAGE_BILLED_NIGHTS` (Task 3).
- Produces: `netNightly(s, slug, guests?, season?: Season)`; `type StayLine = { season: Season; nights: number; billed: number; nightly: number }`; `stayLines(s, method, slug, nights, guests?, checkIn?): StayLine[]`; `PriceBreakdown` suma `lines: StayLine[]` y `weekendPackage: boolean` (conserva `nightly` = precio de la primera línea, y `billedNights` = suma de `billed`).

- [ ] **Step 1: Write the failing tests** (agregar al final de `tests/reservation/method-pricing.test.ts`)

```ts
describe("temporada alta", () => {
  const WITH_HIGH: RateSettings = {
    ...SETTINGS,
    high: {
      nightly: { aratiri: 150000, aguaribay: 150000 },
      minNights: 4,
      ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
    },
  };
  const lowNight = grossUp(SETTINGS.nightly.aguaribay, SETTINGS.cardFeePct);
  const highNight = grossUp(150000, SETTINGS.cardFeePct);

  it("estadía toda en alta: noches al precio de alta", () => {
    const checkIn = new Date(2027, 0, 11);
    expect(methodTotal(WITH_HIGH, "card", "aguaribay", 4, 2, checkIn)).toBe(highNight * 4 + SETTINGS.cleaningFee);
  });

  it("estadía que cruza: cada noche con su temporada, en dos líneas", () => {
    const checkIn = new Date(2026, 11, 13); // 13 y 14 baja, 15 y 16 alta
    const lines = stayLines(WITH_HIGH, "card", "aguaribay", 4, 2, checkIn);
    expect(lines).toEqual([
      { season: "low", nights: 2, billed: 2, nightly: lowNight },
      { season: "high", nights: 2, billed: 2, nightly: highNight },
    ]);
    expect(methodTotal(WITH_HIGH, "card", "aguaribay", 4, 2, checkIn)).toBe(
      lowNight * 2 + highNight * 2 + SETTINGS.cleaningFee,
    );
  });

  it("huésped extra se suma también en alta", () => {
    expect(netNightly(WITH_HIGH, "aratiri", 4, "high")).toBe(150000 + 2 * SETTINGS.extraGuestFee);
  });

  it("viernes con 3 noches en alta: sin promo", () => {
    const friday = new Date(2027, 0, 15);
    const bd = priceBreakdown(WITH_HIGH, "card", "aguaribay", 3, 2, friday);
    expect(bd.weekendPackage).toBe(false);
    expect(bd.billedNights).toBe(3);
    expect(bd.total).toBe(highNight * 3 + SETTINGS.cleaningFee);
  });

  it("viernes con 3 noches en baja: la promo sigue", () => {
    const friday = new Date(2026, 8, 25);
    const bd = priceBreakdown(WITH_HIGH, "card", "aguaribay", 3, 2, friday);
    expect(bd.weekendPackage).toBe(true);
    expect(bd.billedNights).toBe(2.5);
  });

  it("el desglose suma el total en cruces, por los dos métodos", () => {
    const checkIn = new Date(2026, 11, 13);
    for (const method of ["card", "transfer"] as const) {
      const bd = priceBreakdown(WITH_HIGH, method, "aguaribay", 4, 2, checkIn);
      expect(bd.lodging).toBe(bd.lines.reduce((n, l) => n + l.nightly * l.billed, 0));
      expect(bd.listTotal - bd.discount).toBe(bd.total);
      expect(bd.total).toBe(methodTotal(WITH_HIGH, method, "aguaribay", 4, 2, checkIn));
    }
  });

  it("sin bloque high, nada cambia", () => {
    const checkIn = new Date(2027, 0, 11);
    expect(methodTotal(SETTINGS, "card", "aguaribay", 4, 2, checkIn)).toBe(lowNight * 4 + SETTINGS.cleaningFee);
  });
});
```

Agregar `stayLines` al import del archivo de test.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/reservation/method-pricing.test.ts`
Expected: FAIL (`stayLines` no existe).

- [ ] **Step 3: Implementation** en `lib/reservation/method-pricing.ts`

Reemplazar imports:

```ts
import type { UnitSlug } from "@/lib/units";
import type { RateSettings } from "./rate-settings";
import { nightSeasons, type Season } from "./seasons";
import { isWeekendPackage, WEEKEND_PACKAGE_BILLED_NIGHTS } from "./stay-rules";
```

Reemplazar `netNightly`:

```ts
/** Neto por noche según huéspedes y temporada. Sin bloque high, "high" cae al precio de baja. */
export function netNightly(s: RateSettings, slug: UnitSlug, guests = s.baseGuests, season: Season = "low"): number {
  const base = season === "high" && s.high ? s.high.nightly[slug] : s.nightly[slug];
  return base + Math.max(0, guests - s.baseGuests) * s.extraGuestFee;
}
```

Agregar después de `methodRates`:

```ts
/** Un tramo de noches consecutivas de la misma temporada. `billed` < `nights` solo con la promo. */
export type StayLine = { season: Season; nights: number; billed: number; nightly: number };

/** Tramos de la estadía con el precio por noche del método. Sin checkIn no hay fechas: todo baja. */
export function stayLines(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): StayLine[] {
  if (nights <= 0) return [];
  const pct = pctFor(s, method);
  const price = (season: Season) => grossUp(netNightly(s, slug, guests, season), pct);
  const seasons: Season[] = checkIn
    ? nightSeasons(checkIn, nights, s.high?.ranges ?? [])
    : Array.from({ length: nights }, () => "low" as const);
  const lines: StayLine[] = [];
  for (const season of seasons) {
    const last = lines[lines.length - 1];
    if (last && last.season === season) {
      last.nights++;
      last.billed++;
    } else {
      lines.push({ season, nights: 1, billed: 1, nightly: price(season) });
    }
  }
  // La promo exige las 3 noches en baja, así que siempre es una sola línea.
  if (checkIn && isWeekendPackage(checkIn, nights, s)) lines[0].billed = WEEKEND_PACKAGE_BILLED_NIGHTS;
  return lines;
}

const lodgingOf = (lines: StayLine[]) => lines.reduce((sum, l) => sum + l.nightly * l.billed, 0);
```

Reemplazar `methodTotal`:

```ts
export function methodTotal(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): number {
  if (nights <= 0) return 0;
  return lodgingOf(stayLines(s, method, slug, nights, guests, checkIn)) + s.cleaningFee;
}
```

Reemplazar `PriceBreakdown` y `priceBreakdown`:

```ts
export type PriceBreakdown = {
  nightly: number;      // precio de lista por noche de la primera línea (tarjeta)
  nights: number;
  billedNights: number; // suma de noches cobradas (2,5 con la promo)
  lines: StayLine[];    // tramos por temporada, precio de lista (tarjeta)
  lodging: number;      // Σ nightly × billed
  cleaningFee: number;  // el neto configurado, sin gross-up; 0 si nights <= 0
  listTotal: number;    // lodging + cleaningFee
  discount: number;     // 0 con tarjeta; el ahorro con transferencia
  total: number;        // listTotal − discount = lo que se cobra
  weekendPackage: boolean;
};

export function priceBreakdown(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
  guests = s.baseGuests,
  checkIn: Date | null = null,
): PriceBreakdown {
  const lines = stayLines(s, "card", slug, nights, guests, checkIn);
  const lodging = lodgingOf(lines);
  const cleaningFee = nights > 0 ? s.cleaningFee : 0;
  const listTotal = nights > 0 ? lodging + cleaningFee : 0;
  const total = methodTotal(s, method, slug, nights, guests, checkIn);
  return {
    nightly: lines[0]?.nightly ?? methodRates(s, "card", guests).nightly[slug],
    nights,
    billedNights: lines.reduce((n, l) => n + l.billed, 0),
    lines,
    lodging,
    cleaningFee,
    listTotal,
    discount: Math.max(0, listTotal - total),
    total,
    weekendPackage: !!checkIn && isWeekendPackage(checkIn, nights, s),
  };
}
```

Quitar el import de `computeTotal` si queda sin uso.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm exec vitest run tests/reservation && pnpm exec tsc --noEmit`
Expected: PASS. Si `tsc` marca consumidores (`OrderSummary`, `rates.server`), se arreglan en Tasks 5 y 6; anotar los errores y seguir.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation/stay-rules.ts lib/reservation/method-pricing.ts tests/reservation/stay-rules.test.ts tests/reservation/method-pricing.test.ts
git commit -m "feat(tarifas): precio y estadía mínima según temporada"
```

---

### Task 5: Consumidores del server

**Files:**
- Modify: `lib/reservation/rates.server.ts`
- Modify: `app/api/payments/route.ts:105-127`
- Modify: `app/api/reservations/transfer/route.ts:91-99`
- Test: `tests/reservation/rates.server.test.ts`, `tests/reservation/payments-route.test.ts`, `tests/reservation/transfer-route.test.ts` (solo correr)

**Interfaces:**
- Consumes: `stayLines`, `StayLine` (Task 4); `meetsStayMinimum`, `isWeekendPackage` con settings (Task 3).
- Produces: `UnitRate.lines: StayLine[]`; `UnitRate.nightly` = precio de la primera línea.

- [ ] **Step 1: `rates.server.ts`**

Imports: agregar `stayLines, type StayLine` desde `./method-pricing`. En `UnitRate` agregar `lines: StayLine[];`. Reemplazar:

```ts
  const stayValid = meetsStayMinimum(from, to, settings);
```

y dentro del `map`:

```ts
      const lines = stayLines(settings, "card", unit.slug, nights, guests, from);
      const nightly = lines[0]?.nightly ?? card.nightly[unit.slug];
      const total = methodTotal(settings, "card", unit.slug, nights, guests, from);
      const transferTotal = methodTotal(settings, "transfer", unit.slug, nights, guests, from);
      const savings = transferSavings(settings, unit.slug, nights, guests, from);
      const base = {
        unit, nights, nightly, lines, cleaningFee: card.cleaningFee, total, transferTotal, savings,
        weekendPackage: isWeekendPackage(from, nights, settings),
      };
```

- [ ] **Step 2: `app/api/payments/route.ts`** — leer las tarifas antes de validar el mínimo:

```ts
  const unit = resolveUnit(unitId);
  const checkInDate = parseDateOnly(checkIn);
  const checkOutDate = parseDateOnly(checkOut);
  const settings = await getRateSettings();
  if (!isTestUnit(unitId) && !meetsStayMinimum(checkInDate, checkOutDate, settings)) {
    return NextResponse.json({ error: "minimum_nights" }, { status: 400 });
  }
```

y borrar la línea posterior `const settings = await getRateSettings();`.

- [ ] **Step 3: `app/api/reservations/transfer/route.ts`** — mismo cambio:

```ts
  const checkInDate = parseDateOnly(checkIn);
  const checkOutDate = parseDateOnly(checkOut);
  const settings = await getRateSettings();
  if (!meetsStayMinimum(checkInDate, checkOutDate, settings)) return bad();
  if (guests > unit.specs.guests) return bad();
  const nights = computeNights(new Date(checkIn), new Date(checkOut));
```

y borrar la `const settings = await getRateSettings();` posterior.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run tests/reservation`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation/rates.server.ts app/api/payments/route.ts app/api/reservations/transfer/route.ts
git commit -m "feat(tarifas): rutas de cobro y cotización usan la temporada"
```

---

### Task 6: Interfaz pública

**Files:**
- Modify: `components/reservas/OrderSummary.tsx:93-117`
- Modify: `components/tarifas/UnitRateCard.tsx:83-87`
- Modify: `components/home/SearchWidget.tsx` (prop `stay`)
- Modify: `app/[locale]/page.tsx:120`, `app/[locale]/tarifas/page.tsx:88,115`
- Modify: `components/tarifas/InfoSections.tsx` (prop `highMinNights`)
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json`
- Test: `tests/reservation/order-summary.test.tsx`

**Interfaces:**
- Consumes: `PriceBreakdown.lines`, `PriceBreakdown.weekendPackage` (Task 4); `UnitRate.lines` (Task 5); `StaySettings`, `minimumNights` (Task 3).

- [ ] **Step 1: Mensajes.** En los tres idiomas, namespace `tarifas` y `reservas` (las dos claves en ambos):

| clave | es | en | pt |
| --- | --- | --- | --- |
| `seasonLow` | Temporada baja | Low season | Baixa temporada |
| `seasonHigh` | Temporada alta | High season | Alta temporada |

En `tarifas`: `weekendPromoBody` → es "Reservando de viernes a lunes, disfrutás tres noches y abonás sólo dos noches y media. Válido sólo en temporada baja." · en "Book from Friday to Monday and enjoy three nights while paying for only two and a half. Low season only." · pt "Reserve de sexta a segunda e aproveite três noites pagando apenas duas e meia. Válido só na baixa temporada.". En `tarifas.conditions` agregar `stayHigh` (es "Estadía mínima temporada alta" · en "Minimum stay, high season" · pt "Estadia mínima alta temporada") y `stayHighValue` (es "{n} noches" · en "{n} nights" · pt "{n} noites").

- [ ] **Step 2: `OrderSummary`** — reemplazar la fila `{money(bd.nightly)} × {bd.billedNights || 0}` por una fila por tramo:

```tsx
            {(bd.lines.length > 0 ? bd.lines : [{ season: "low" as const, nights: 0, billed: 0, nightly: bd.nightly }]).map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span className="text-muted">
                  {showSeason && `${t(l.season === "high" ? "seasonHigh" : "seasonLow")} · `}
                  {money(l.nightly)} × {l.billed}
                </span>
                <span style={{ color: "var(--color-carbon)" }}>
                  {nights > 0 ? money(l.nightly * l.billed) : "—"}
                </span>
              </div>
            ))}
```

con `const showSeason = !!bd && bd.lines.some((l) => l.season === "high");` arriba del `return`, y la leyenda de la promo pasa a `{nights > 0 && bd.weekendPackage && (…)}`.

- [ ] **Step 3: `UnitRateCard`** — reemplazar la línea `{rate.nights} … {money(nightly)} {t("perNight")}` por:

```tsx
                {rate.lines.length > 1 ? (
                  rate.lines.map((l) => (
                    <div key={l.season + l.nights} className="mt-2 text-[11.5px] text-muted">
                      {l.nights} {l.nights === 1 ? t("night") : t("nights")} · {t(l.season === "high" ? "seasonHigh" : "seasonLow")} · {money(l.nightly)} {t("perNight")}
                    </div>
                  ))
                ) : (
                  <div className="mt-2 text-[11.5px] text-muted">
                    {rate.nights} {rate.nights === 1 ? t("night") : t("nights")} · {money(nightly)} {t("perNight")}
                    {rate.lines[0]?.season === "high" && ` · ${t("seasonHigh")}`}
                  </div>
                )}
```

- [ ] **Step 4: `SearchWidget`** — agregar `stay?: StaySettings` a `SearchWidgetProps`, desestructurarlo y usar `minimumNights(checkIn, stay)` en sus dos llamadas. En `app/[locale]/page.tsx`: `<SearchWidget variant="hero" stay={{ high: rateSettings.high }} />`. En `app/[locale]/tarifas/page.tsx`: `<SearchWidget variant="bar" initial={query ?? undefined} stay={{ high: settings.high }} />`.

- [ ] **Step 5: `InfoSections`** — prop opcional `highMinNights?: number`; si viene, agregar una fila después de `conditions.stay`:

```tsx
          {highMinNights !== undefined && (
            <div className={rowClass}>
              <span>{t("conditions.stayHigh")}</span>
              <span>{t("conditions.stayHighValue", { n: highMinNights })}</span>
            </div>
          )}
```

En `tarifas/page.tsx`: `<InfoSections highMinNights={settings.high && settings.high.ranges.length > 0 ? settings.high.minNights : undefined} />`.

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS, salvo los 2 de `range-calendar.test.tsx` (Task 8).

- [ ] **Step 7: Commit**

```bash
git add components app/[locale] messages
git commit -m "feat(tarifas): mostrar tramos de temporada en checkout y tarifas"
```

---

### Task 7: Panel `/admin/tarifas`

**Files:**
- Modify: `app/admin/tarifas/actions.ts`
- Modify: `app/admin/tarifas/RateForm.tsx`
- Test: `tests/admin/tarifas-actions.test.ts`

**Interfaces:**
- Consumes: `RateSettingsInput` con claves `high_*` (Task 2); `grossUp`, `netNightly` (Task 4).

- [ ] **Step 1: Test.** En `tests/admin/tarifas-actions.test.ts`, al `FormData` válido agregarle `high_nightly_aratiri=149800`, `high_nightly_aguaribay=149800`, `high_min_nights=4`, `high_season_ranges=[{"from":"2026-12-15","to":"2027-02-28"}]`, y un caso que espere `{ error }` con `high_min_nights=0`.

- [ ] **Step 2: `actions.ts`** — sumar al `raw`:

```ts
    high_nightly_aratiri: String(formData.get("high_nightly_aratiri") ?? ""),
    high_nightly_aguaribay: String(formData.get("high_nightly_aguaribay") ?? ""),
    high_min_nights: String(formData.get("high_min_nights") ?? ""),
    high_season_ranges: String(formData.get("high_season_ranges") ?? "[]"),
```

y en el loop de revalidación agregar `revalidatePath(\`/${locale}\`);` (el buscador del home recibe los rangos).

- [ ] **Step 3: `RateForm.tsx`** — nueva sección antes de "Condiciones de temporada baja":
  - estado `highNightly` (por cabaña, default `settings.high?.nightly[slug] ?? settings.nightly[slug]`), `highMin` (default `settings.high?.minNights ?? 4`), `ranges` (default `settings.high?.ranges ?? []`);
  - inputs `high_nightly_<slug>` con vista previa tarjeta/transferencia igual que la de baja;
  - input `high_min_nights` (1–30);
  - lista de filas con dos `<input type="date">` (desde, hasta) y botón "Quitar"; botón "Agregar rango";
  - `<input type="hidden" name="high_season_ranges" value={JSON.stringify(ranges.filter(r => r.from && r.to))} />`.
  - En "Condiciones de temporada baja" agregar `<li>En temporada alta no aplica el paquete de fin de semana.</li>`.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm exec vitest run tests/admin && pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/tarifas tests/admin/tarifas-actions.test.ts
git commit -m "feat(admin): configurar temporada alta en /admin/tarifas"
```

---

### Task 8: Tests de `RangeCalendar` con fechas fijas

**Files:**
- Modify: `tests/reservation/range-calendar.test.tsx`

- [ ] **Step 1:** Fijar el reloj antes de cada test, solo `Date` (no timers, para no frenar React):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 6, 1)); // 1 jul 2026: las fechas de los tests quedan en el futuro
});
afterEach(() => {
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run** `pnpm exec vitest run tests/reservation/range-calendar.test.tsx` → PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/reservation/range-calendar.test.tsx
git commit -m "test(calendario): fijar la fecha del sistema en los tests de RangeCalendar"
```

---

### Task 9: Migración, verificación y despliegue

- [ ] **Step 1: Migración en vivo** (Supabase CLI ya vinculada al proyecto `aqknzqtxhgsrhfaskoeo`): correr el bloque de Task 2 y sembrar el rango de ejemplo.

```bash
npx supabase db query --linked "<bloque alter table de Task 2>"
npx supabase db query --linked "update public.rate_settings set high_season_ranges = '[{\"from\":\"2026-12-15\",\"to\":\"2027-02-28\"}]'::jsonb where id = 1 and high_season_ranges = '[]'::jsonb"
```

- [ ] **Step 2:** `pnpm test`, `pnpm exec tsc --noEmit`, `node ./node_modules/next/dist/bin/next build` → todo limpio.
- [ ] **Step 3:** Push a `main` (deploy de Netlify desde GitHub).
- [ ] **Step 4:** Verificar en producción `/es/tarifas?checkIn=2027-01-11&checkOut=2027-01-15&guests=2` (todo alta), `/es/tarifas?checkIn=2026-12-13&checkOut=2026-12-17&guests=2` (cruce) y `/es/tarifas?checkIn=2026-11-06&checkOut=2026-11-09&guests=2` (promo en baja).
