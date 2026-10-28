import { describe, it, expect, vi, beforeEach } from "vitest";

// Mismo hueco que en configuracion/actions.ts: el middleware guarda por path,
// no por Server Action (ver middleware.ts). saveRates tiene que exigir su
// propia sesión de admin.
const getAdminUser = vi.fn();
vi.mock("@/lib/admin/auth", () => ({
  getAdminUser: (...a: unknown[]) => getAdminUser(...a),
}));

const saveRateSettings = vi.fn();
vi.mock("@/lib/reservation/rate-settings.server", () => ({
  saveRateSettings: (...a: unknown[]) => saveRateSettings(...a),
}));

import { saveRates } from "@/app/admin/tarifas/actions";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const VALID_RATES = {
  nightly_aratiri: "100000",
  nightly_aguaribay: "95000",
  cleaning_fee: "30000",
  base_guests: "4",
  extra_guest_fee: "5000",
  card_fee_pct: "7.7",
  transfer_fee_pct: "0",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveRates sin sesión de admin", () => {
  it("no persiste tarifas nuevas y devuelve error", async () => {
    getAdminUser.mockResolvedValue(null);
    const res = await saveRates(undefined, fd(VALID_RATES));
    expect(res).toEqual({ error: expect.any(String) });
    expect(saveRateSettings).not.toHaveBeenCalled();
  });
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("saveRates con temporada alta", () => {
  const HIGH = {
    ...VALID_RATES,
    high_nightly_aratiri: "149800",
    high_nightly_aguaribay: "149800",
    high_min_nights: "4",
    high_season_ranges: JSON.stringify([{ from: "2026-12-15", to: "2027-02-28" }]),
  };

  it("guarda precios, mínimo y rangos de alta", async () => {
    getAdminUser.mockResolvedValue({ email: "admin@test.com" });
    const res = await saveRates(undefined, fd(HIGH));
    expect(res).toEqual({ ok: true });
    expect(saveRateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        high: {
          nightly: { aratiri: 149800, aguaribay: 149800 },
          minNights: 4,
          ranges: [{ from: "2026-12-15", to: "2027-02-28" }],
        },
      }),
    );
  });

  it("rechaza un mínimo de alta inválido sin guardar", async () => {
    getAdminUser.mockResolvedValue({ email: "admin@test.com" });
    const res = await saveRates(undefined, fd({ ...HIGH, high_min_nights: "0" }));
    expect(res).toEqual({ error: expect.any(String) });
    expect(saveRateSettings).not.toHaveBeenCalled();
  });
});
