import { describe, it, expect, beforeEach, vi } from "vitest";

// Cadena de supabase-js: from().select().eq().neq().lt().gt() → { data, error }
const gt = vi.fn();
const lt = vi.fn(() => ({ gt }));
const neq = vi.fn(() => ({ lt }));
const eq = vi.fn(() => ({ neq }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
vi.mock("@/lib/supabase/server", () => ({ getServiceClient: () => ({ from }) }));

import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import { GET } from "@/app/api/availability/[unitId]/route";

const RANGE = { from: new Date(2026, 5, 1), to: new Date(2026, 11, 1) };

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ neq });
  neq.mockReturnValue({ lt });
  lt.mockReturnValue({ gt });
  gt.mockResolvedValue({ data: [], error: null });
});

describe("getAvailabilityServer", () => {
  it("expande cada reserva a sus noches ocupadas (checkout es turnover)", async () => {
    gt.mockResolvedValueOnce({
      data: [{ check_in: "2026-06-10", check_out: "2026-06-12" }],
      error: null,
    });
    const res = await getAvailabilityServer("aratiri", RANGE);
    expect(res.source).toBe("supabase");
    expect(res.disabledDates).toHaveLength(2); // 10 y 11; 12 libre
    expect(res.disabledDates[0].getFullYear()).toBe(2026);
    expect(res.disabledDates[0].getMonth()).toBe(5); // junio
    expect(res.disabledDates[0].getDate()).toBe(10);
  });

  it("filtra por unidad y exclue liberadas", async () => {
    await getAvailabilityServer("aguaribay", RANGE);
    expect(from).toHaveBeenCalledWith("reservations");
    expect(eq).toHaveBeenCalledWith("unit_id", "aguaribay");
    expect(neq).toHaveBeenCalledWith("status", "released");
  });

  it("fail-open (stub) si la query devuelve error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    gt.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const res = await getAvailabilityServer("aratiri", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });

  it("fail-open (stub) si la query lanza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    gt.mockRejectedValueOnce(new Error("network"));
    const res = await getAvailabilityServer("aratiri", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });
});

describe("GET /api/availability/[unitId]", () => {
  function ctx(unitId: string) {
    return { params: Promise.resolve({ unitId }) };
  }

  it("serializa las noches ocupadas como YYYY-MM-DD", async () => {
    gt.mockResolvedValueOnce({
      data: [{ check_in: "2026-06-10", check_out: "2026-06-12" }],
      error: null,
    });
    const req = new Request("http://t/api/availability/aratiri?from=2026-06-01&to=2026-12-01");
    const res = await GET(req, ctx("aratiri"));
    const body = await res.json();
    expect(body.source).toBe("supabase");
    expect(body.disabledDates).toEqual(["2026-06-10", "2026-06-11"]);
  });

  it("devuelve 400 + stub para una unidad inválida", async () => {
    const req = new Request("http://t/api/availability/nope");
    const res = await GET(req, ctx("nope"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ disabledDates: [], source: "stub" });
  });

  it("devuelve 400 + stub si from/to son inválidas", async () => {
    const req = new Request("http://t/api/availability/aratiri?from=garbage&to=2026-12-01");
    const res = await GET(req, ctx("aratiri"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ disabledDates: [], source: "stub" });
  });
});
