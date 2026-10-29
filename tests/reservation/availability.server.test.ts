import { describe, it, expect, beforeEach, vi } from "vitest";

// Cadena de supabase-js: from().select().in().neq().or().lt().gt() → { data, error }
const gt = vi.fn();
const lt = vi.fn(() => ({ gt }));
const or = vi.fn(() => ({ lt }));
const neq = vi.fn(() => ({ or }));
const inFn = vi.fn(() => ({ neq }));
const select = vi.fn(() => ({ in: inFn }));
const from = vi.fn(() => ({ select }));
vi.mock("@/lib/supabase/server", () => ({ getServiceClient: () => ({ from }) }));
const releaseExpiredPendingReservations = vi.fn(() => Promise.resolve());
vi.mock("@/lib/reservation/reservations.server", () => ({
  releaseExpiredPendingReservations: () => releaseExpiredPendingReservations(),
}));

import { getAvailabilityServer, getBlockedNightsByUnit } from "@/lib/reservation/availability.server";
import { GET } from "@/app/api/availability/[unitId]/route";

const RANGE = { from: new Date(2026, 5, 1), to: new Date(2026, 11, 1) };

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ select });
  select.mockReturnValue({ in: inFn });
  inFn.mockReturnValue({ neq });
  neq.mockReturnValue({ or });
  or.mockReturnValue({ lt });
  lt.mockReturnValue({ gt });
  gt.mockResolvedValue({ data: [], error: null });
});

describe("getAvailabilityServer", () => {
  it("expande cada reserva a sus noches ocupadas (checkout es turnover)", async () => {
    gt.mockResolvedValueOnce({
      data: [{ unit_id: "aratiri", check_in: "2026-06-10", check_out: "2026-06-12" }],
      error: null,
    });
    const res = await getAvailabilityServer("aratiri", RANGE);
    expect(res.source).toBe("supabase");
    expect(res.disabledDates).toHaveLength(2); // 10 y 11; 12 libre
    expect(res.disabledDates[0].getFullYear()).toBe(2026);
    expect(res.disabledDates[0].getMonth()).toBe(5); // junio
    expect(res.disabledDates[0].getDate()).toBe(10);
  });

  it("filtra por unidad, excluye liberadas y holds vencidos — sin escribir en la base", async () => {
    await getAvailabilityServer("aguaribay", RANGE);
    expect(from).toHaveBeenCalledWith("reservations");
    expect(inFn).toHaveBeenCalledWith("unit_id", ["aguaribay"]);
    expect(neq).toHaveBeenCalledWith("status", "released");
    // Un hold vencido no bloquea: se filtra en la lectura en vez de limpiarlo
    // con un UPDATE en cada consulta de disponibilidad.
    expect(or).toHaveBeenCalledWith(expect.stringMatching(/^status.neq.pending,expires_at.is.null,expires_at.gt./));
    expect(releaseExpiredPendingReservations).not.toHaveBeenCalled();
  });

  it("varias cabañas en UNA consulta, repartidas por unidad", async () => {
    gt.mockResolvedValueOnce({
      data: [
        { unit_id: "aratiri", check_in: "2026-06-10", check_out: "2026-06-11" },
        { unit_id: "aguaribay", check_in: "2026-06-20", check_out: "2026-06-22" },
      ],
      error: null,
    });
    const res = await getBlockedNightsByUnit(["aratiri", "aguaribay"], RANGE);
    expect(from).toHaveBeenCalledTimes(1);
    expect(res.source).toBe("supabase");
    expect(res.byUnit.aratiri).toHaveLength(1);
    expect(res.byUnit.aguaribay).toHaveLength(2);
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
      data: [{ unit_id: "aratiri", check_in: "2026-06-10", check_out: "2026-06-12" }],
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
