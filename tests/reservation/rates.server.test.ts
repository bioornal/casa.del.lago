import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/reservation/availability.server", () => ({
  getAvailabilityServer: vi.fn(),
}));

import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import { getRatesForRange } from "@/lib/reservation/rates.server";
import { UNITS, CLEANING_FEE, pricePerNight, GUATAMBU_PRICE } from "@/lib/units";

const mocked = vi.mocked(getAvailabilityServer);

beforeEach(() => mocked.mockReset());

describe("getRatesForRange", () => {
  it("disponible + total correcto cuando no hay noches ocupadas", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates).toHaveLength(UNITS.length);
    const timbo = rates.find((r) => r.unit.slug === "timbo")!;
    expect(timbo.nights).toBe(3);
    expect(timbo.available).toBe(true);
    expect(timbo.total).toBe(pricePerNight("timbo", 4) * 3 + CLEANING_FEE);
  });

  it("tarifa plana: mismo precio sin importar el número de huéspedes", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 6);
    const timbo = rates.find((r) => r.unit.slug === "timbo")!;
    expect(timbo.total).toBe(pricePerNight("timbo", 6) * 3 + CLEANING_FEE);
    expect(pricePerNight("timbo", 6)).toBe(130000);
    expect(pricePerNight("lapacho", 6)).toBe(95000);
  });

  it("guatambu tiene tarifa plana sin importar el número de huéspedes", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    const guatambu = rates.find((r) => r.unit.slug === "guatambu")!;
    expect(guatambu.total).toBe(GUATAMBU_PRICE * 3 + CLEANING_FEE);
    expect(pricePerNight("guatambu", 4)).toBe(110000);
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
