import { describe, it, expect, vi, beforeEach } from "vitest";

const getReservationById = vi.fn();
const setReservationStatus = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  getReservationById: (...a: unknown[]) => getReservationById(...a),
  setReservationStatus: (...a: unknown[]) => setReservationStatus(...a),
}));

const getAdminUser = vi.fn();
vi.mock("@/lib/admin/auth", () => ({
  getAdminUser: (...a: unknown[]) => getAdminUser(...a),
}));

const sendConfirmationEmailOnce = vi.fn();
vi.mock("@/lib/reservation/email.server", () => ({
  sendConfirmationEmailOnce: (...a: unknown[]) => sendConfirmationEmailOnce(...a),
}));

import { POST } from "@/app/api/admin/reservations/[id]/route";

function post(action: string) {
  return new Request("http://t/api/admin/reservations/abc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}
const ctx = { params: Promise.resolve({ id: "abc" }) };

beforeEach(() => {
  vi.clearAllMocks();
  getAdminUser.mockResolvedValue({ email: "admin@aruma.com" });
  getReservationById.mockResolvedValue({
    id: "abc", unit_id: "aguaribay",
    payment_method: "transfer", status: "pending", code: "CDL-2026-AB12",
  });
});

describe("POST /api/admin/reservations/[id]", () => {
  it("confirm → status confirmed + email", async () => {
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(200);
    expect(setReservationStatus).toHaveBeenCalledWith("abc", "confirmed");
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith("CDL-2026-AB12");
  });

  it("release → status released", async () => {
    const res = await POST(post("release"), ctx);
    expect(res.status).toBe(200);
    expect(setReservationStatus).toHaveBeenCalledWith("abc", "released");
  });

  it("401 si no hay admin", async () => {
    getAdminUser.mockResolvedValue(null);
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(401);
  });

  it("400 si la reserva no está pending", async () => {
    getReservationById.mockResolvedValue({ id: "abc", payment_method: "card", status: "confirmed" });
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(400);
    expect(setReservationStatus).not.toHaveBeenCalled();
  });

  it("404 si la reserva no existe", async () => {
    getReservationById.mockResolvedValue(null);
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(404);
  });

  it("release funciona para un hold de tarjeta pending", async () => {
    getReservationById.mockResolvedValueOnce({
      id: "id-c", code: "CDL-C", unit_id: "aratiri",
      payment_method: "card", status: "pending",
    });
    const res = await POST(post("release"), ctx);
    expect(res.status).toBe(200);
    expect(setReservationStatus).toHaveBeenCalledWith("abc", "released");
  });

  it("confirm sigue rechazando una reserva de tarjeta (invalid_state)", async () => {
    getReservationById.mockResolvedValueOnce({
      id: "id-c2", code: "CDL-C2", unit_id: "aratiri",
      payment_method: "card", status: "pending",
    });
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(400);
    expect(setReservationStatus).not.toHaveBeenCalled();
  });
});
