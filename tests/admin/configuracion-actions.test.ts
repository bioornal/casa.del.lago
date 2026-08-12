import { describe, it, expect, vi, beforeEach } from "vitest";

// El middleware guarda por PATH (ver middleware.ts, isAdminPath), no por Server
// Action: un POST con el Next-Action id correcto llega directo acá sin pasar
// por guardAdmin. Estas dos acciones tienen que exigir su propia sesión.
const getAdminUser = vi.fn();
vi.mock("@/lib/admin/auth", () => ({
  getAdminUser: (...a: unknown[]) => getAdminUser(...a),
}));

const saveSiteSettings = vi.fn();
const saveTestUnitEnabled = vi.fn();
vi.mock("@/lib/site-settings.server", () => ({
  saveSiteSettings: (...a: unknown[]) => saveSiteSettings(...a),
  saveTestUnitEnabled: (...a: unknown[]) => saveTestUnitEnabled(...a),
}));

import { saveBookingMode, saveTestUnit } from "@/app/admin/configuracion/actions";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveBookingMode sin sesión de admin", () => {
  it("no persiste el modo y devuelve error", async () => {
    getAdminUser.mockResolvedValue(null);
    const res = await saveBookingMode(undefined, fd({ booking_mode: "online" }));
    expect(res).toEqual({ error: expect.any(String) });
    expect(saveSiteSettings).not.toHaveBeenCalled();
  });
});

describe("saveTestUnit sin sesión de admin", () => {
  it("no habilita el cobro: no persiste el flag y devuelve error", async () => {
    // Esta es la que habilita el endpoint de cobro real de la unidad de
    // prueba: el review pide verla cubierta de forma explícita, no solo
    // implícita en el patrón compartido con saveBookingMode.
    getAdminUser.mockResolvedValue(null);
    const res = await saveTestUnit(undefined, fd({ test_unit_enabled: "1" }));
    expect(res).toEqual({ error: expect.any(String) });
    expect(saveTestUnitEnabled).not.toHaveBeenCalled();
  });
});
