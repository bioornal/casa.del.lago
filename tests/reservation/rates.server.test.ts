import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/reservation/availability.server", () => ({
  getBlockedNightsByUnit: vi.fn(),
}));

// Tarifas: siempre los defaults (los mismos valores de lib/units) — el test no
// depende de la DB ni de lo que el admin edite en /admin/tarifas.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

import { getBlockedNightsByUnit } from "@/lib/reservation/availability.server";
import { getRatesForRange } from "@/lib/reservation/rates.server";
import { UNITS, pricePerNight } from "@/lib/units";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { methodTotal, transferSavings } from "@/lib/reservation/method-pricing";

const mocked = vi.mocked(getBlockedNightsByUnit);
/** Las mismas noches ocupadas en todas las cabañas. */
const busy = (dates: Date[]) =>
  mocked.mockResolvedValue({ byUnit: Object.fromEntries(UNITS.map((u) => [u.slug, dates])), source: "supabase" });

beforeEach(() => mocked.mockReset());

describe("getRatesForRange", () => {
  it("disponible + montos públicos = método tarjeta (comisión incluida) + ahorro transferencia", async () => {
    busy([]);
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates).toHaveLength(UNITS.length);
    const aratiri = rates.find((r) => r.unit.slug === "aratiri")!;
    expect(aratiri.nights).toBe(3);
    expect(aratiri.available).toBe(true);
    expect(aratiri.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "aratiri", 3, 4));
    expect(aratiri.transferTotal).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "transfer", "aratiri", 3, 4));
    expect(aratiri.savings).toBe(transferSavings(DEFAULT_RATE_SETTINGS, "aratiri", 3, 4));
    expect(aratiri.savings).toBeGreaterThan(0);
    // El precio de lista es MAYOR al neto configurado (la comisión va adentro)
    expect(aratiri.nightly).toBeGreaterThan(DEFAULT_RATE_SETTINGS.nightly.aratiri);
  });

  it("suma $20.000 por huésped adicional", async () => {
    busy([]);
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 6);
    const aratiri = rates.find((r) => r.unit.slug === "aratiri")!;
    expect(aratiri.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "aratiri", 3, 6));
    expect(pricePerNight("aratiri", 6)).toBe(179800);
    expect(pricePerNight("aguaribay", 6)).toBe(179800);
  });

  it("aguaribay: total de lista consistente con method-pricing", async () => {
    busy([]);
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    const aguaribay = rates.find((r) => r.unit.slug === "aguaribay")!;
    expect(aguaribay.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "aguaribay", 3, 4));
    expect(pricePerNight("aguaribay", 4)).toBe(139800);
  });

  it("no disponible si alguna noche del rango está ocupada", async () => {
    busy([new Date(2026, 6, 3)]);
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates.every((r) => r.available === false)).toBe(true);
  });

  it("el check-out es exclusivo: una fecha ocupada igual al check-out no afecta", async () => {
    busy([new Date(2026, 6, 5)]);
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates.every((r) => r.available === true)).toBe(true);
  });

  it("consulta la disponibilidad de todas las cabañas en UNA llamada", async () => {
    busy([]);
    await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked.mock.calls[0][0]).toEqual(UNITS.map((u) => u.slug));
  });

  it("sin noches válidas no consulta la base", async () => {
    busy([]);
    await getRatesForRange("2026-07-05", "2026-07-05", 4);
    expect(mocked).not.toHaveBeenCalled();
  });
});
