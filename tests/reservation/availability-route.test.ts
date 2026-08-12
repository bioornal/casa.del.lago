import { describe, it, expect, vi, beforeEach } from "vitest";

const isTestUnitEnabled = vi.fn();
const getAvailabilityServer = vi.fn();

// Factory completo a propósito: si el módulo bajo prueba importa algo de
// site-settings.server que acá falta, queda en undefined en runtime — la
// trampa de siempre con vi.mock.
vi.mock("@/lib/site-settings.server", () => ({
  isTestUnitEnabled: (...a: unknown[]) => isTestUnitEnabled(...a),
}));
vi.mock("@/lib/reservation/availability.server", () => ({
  getAvailabilityServer: (...a: unknown[]) => getAvailabilityServer(...a),
}));

import { GET } from "@/app/api/availability/[unitId]/route";

function req(unitId: string) {
  return new Request(`http://t/api/availability/${unitId}`);
}

function ctx(unitId: string) {
  return { params: Promise.resolve({ unitId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAvailabilityServer.mockResolvedValue({ disabledDates: [], source: "supabase" });
});

describe("GET /api/availability/[unitId]", () => {
  it("con el flag apagado, la unidad de prueba responde igual que una inexistente", async () => {
    isTestUnitEnabled.mockResolvedValue(false);
    const resPrueba = await GET(req("prueba"), ctx("prueba"));
    const resInventada = await GET(req("inventada"), ctx("inventada"));
    expect(resPrueba.status).toBe(400);
    expect(resInventada.status).toBe(400);
    expect(await resPrueba.json()).toEqual(await resInventada.json());
    expect(getAvailabilityServer).not.toHaveBeenCalled();
  });

  it("con el flag prendido, la unidad de prueba responde normal", async () => {
    isTestUnitEnabled.mockResolvedValue(true);
    const res = await GET(req("prueba"), ctx("prueba"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ disabledDates: [], source: "supabase" });
    expect(getAvailabilityServer).toHaveBeenCalledWith("prueba", expect.any(Object));
  });
});
