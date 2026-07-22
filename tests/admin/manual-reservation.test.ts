import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ getAdminUser: vi.fn(() => Promise.resolve({ email: "a@a.com" })) }));

const { OverlapError, insertReservation } = vi.hoisted(() => {
  class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
  return { OverlapError, insertReservation: vi.fn() };
});
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  OverlapError,
}));

import { createManualReservation } from "@/app/admin/reservas/actions";

const VALID = {
  unitId: "aratiri", checkIn: "2026-08-01", checkOut: "2026-08-04",
  guests: 2, firstName: "Ana", lastName: "Gómez", email: "ana@t.com", phone: "+54",
};

beforeEach(() => {
  vi.clearAllMocks();
  insertReservation.mockResolvedValue(undefined);
});

describe("createManualReservation", () => {
  it("inserta con payment_method manual y status confirmed", async () => {
    const res = await createManualReservation(VALID);
    expect(res).toEqual({ ok: true });
    const row = insertReservation.mock.calls[0][0];
    expect(row.paymentMethod).toBe("manual");
    expect(row.status).toBe("confirmed");
    expect(row.nights).toBe(3);
  });

  it("devuelve conflict ante OverlapError", async () => {
    insertReservation.mockRejectedValueOnce(new OverlapError());
    const res = await createManualReservation(VALID);
    expect(res).toEqual({ ok: false, error: "conflict" });
  });

  it("valida fechas invertidas", async () => {
    const res = await createManualReservation({ ...VALID, checkOut: "2026-07-30" });
    expect(res).toEqual({ ok: false, error: "validation" });
    expect(insertReservation).not.toHaveBeenCalled();
  });
});
