import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/reservation/availability.server", () => ({
  getAvailabilityServer: vi.fn(),
}));

// Tarifas: siempre los defaults (los mismos valores de lib/units) — el test no
// depende de la DB ni de lo que el admin edite en /admin/tarifas.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import { getRatesForRange } from "@/lib/reservation/rates.server";
import { UNITS, pricePerNight } from "@/lib/units";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { methodTotal, transferSavings } from "@/lib/reservation/method-pricing";

const mocked = vi.mocked(getAvailabilityServer);

beforeEach(() => mocked.mockReset());

describe("getRatesForRange", () => {
  it("disponible + montos públicos = método tarjeta (comisión incluida) + ahorro transferencia", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates).toHaveLength(UNITS.length);
    const aratiri = rates.find((r) => r.unit.slug === "aratiri")!;
    expect(aratiri.nights).toBe(3);
    expect(aratiri.available).toBe(true);
    expect(aratiri.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "aratiri", 3));
    expect(aratiri.transferTotal).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "transfer", "aratiri", 3));
    expect(aratiri.savings).toBe(transferSavings(DEFAULT_RATE_SETTINGS, "aratiri", 3));
    expect(aratiri.savings).toBeGreaterThan(0);
    // El precio de lista es MAYOR al neto configurado (la comisión va adentro)
    expect(aratiri.nightly).toBeGreaterThan(DEFAULT_RATE_SETTINGS.nightly.aratiri);
  });

  it("tarifa plana: mismo precio sin importar el número de huéspedes", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 6);
    const aratiri = rates.find((r) => r.unit.slug === "aratiri")!;
    expect(aratiri.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "aratiri", 3));
    expect(pricePerNight("aratiri", 6)).toBe(130000);
    expect(pricePerNight("aguaribay", 6)).toBe(95000);
  });

  it("aguaribay: total de lista consistente con method-pricing", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    const aguaribay = rates.find((r) => r.unit.slug === "aguaribay")!;
    expect(aguaribay.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "aguaribay", 3));
    expect(pricePerNight("aguaribay", 4)).toBe(95000);
  });

  it("no disponible si alguna noche del rango está ocupada", async () => {
    mocked.mockResolvedValue({ disabledDates: [new Date(2026, 6, 3)], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates.every((r) => r.available === false)).toBe(true);
  });

  it("el check-out es exclusivo: una fecha ocupada igual al check-out no afecta", async () => {
    mocked.mockResolvedValue({ disabledDates: [new Date(2026, 6, 5)], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates.every((r) => r.available === true)).toBe(true);
  });
});
