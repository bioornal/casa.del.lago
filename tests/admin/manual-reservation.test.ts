import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ getAdminUser: vi.fn(() => Promise.resolve({ email: "a@a.com" })) }));

const { OverlapError, insertReservation, generateUniqueBookingCode, releaseExpiredPendingReservations } = vi.hoisted(() => {
  class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
  return { OverlapError, insertReservation: vi.fn(), generateUniqueBookingCode: vi.fn(), releaseExpiredPendingReservations: vi.fn() };
});
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  generateUniqueBookingCode: (...a: unknown[]) => generateUniqueBookingCode(...a),
  releaseExpiredPendingReservations: (...a: unknown[]) => releaseExpiredPendingReservations(...a),
  OverlapError,
}));

import { createManualReservation } from "@/app/admin/reservas/actions";

const VALID = {
  unitId: "aratiri", checkIn: "2027-08-01", checkOut: "2027-08-04",
  guests: 2, firstName: "Ana", lastName: "Gómez", email: "ana@t.com", phone: "+54",
};

beforeEach(() => {
  vi.clearAllMocks();
  insertReservation.mockResolvedValue(undefined);
  releaseExpiredPendingReservations.mockResolvedValue(undefined);
  // Alfabeto sin 0/O ni 1/I (ver lib/reservation/code.ts): "AB23" respeta el
  // regex /^CDL-\d{4}-[A-Z2-9]{4}$/ que ya verifican los tests de forma.
  generateUniqueBookingCode.mockResolvedValue("CDL-2026-AB23");
});

describe("createManualReservation", () => {
  it("libera los holds vencidos antes de insertar: un hold de tarjeta caducado no bloquea la carga", async () => {
    await createManualReservation(VALID);
    expect(releaseExpiredPendingReservations).toHaveBeenCalledOnce();
    expect(releaseExpiredPendingReservations.mock.invocationCallOrder[0]).toBeLessThan(
      insertReservation.mock.invocationCallOrder[0],
    );
  });

  it("inserta con payment_method manual y status confirmed", async () => {
    const res = await createManualReservation(VALID);
    expect(res).toEqual({ ok: true });
    const row = insertReservation.mock.calls[0][0];
    expect(row.paymentMethod).toBe("manual");
    expect(row.status).toBe("confirmed");
    expect(row.nights).toBe(3);
    // generateBookingCode() sortea sobre 32^4 sin mirar la base. El código es la
    // clave del lookup, del email y del flip de dedup: dos reservas con el mismo
    // código se pisan.
    expect(generateUniqueBookingCode).toHaveBeenCalledOnce();
  });

  it("devuelve error de código si no se consigue uno libre, sin insertar nada", async () => {
    generateUniqueBookingCode.mockRejectedValueOnce(new Error("sin códigos libres"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await createManualReservation(VALID);
    expect(res).toEqual({ ok: false, error: "code" });
    expect(insertReservation).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("devuelve conflict ante OverlapError", async () => {
    insertReservation.mockRejectedValueOnce(new OverlapError());
    const res = await createManualReservation(VALID);
    expect(res).toEqual({ ok: false, error: "conflict" });
  });

  it("valida fechas invertidas", async () => {
    const res = await createManualReservation({ ...VALID, checkOut: "2027-07-30" });
    expect(res).toEqual({ ok: false, error: "validation" });
    expect(insertReservation).not.toHaveBeenCalled();
  });
});
