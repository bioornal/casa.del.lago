import { describe, it, expect, vi, beforeEach } from "vitest";

const getAdminUser = vi.fn();
vi.mock("@/lib/admin/auth", () => ({ getAdminUser: (...a: unknown[]) => getAdminUser(...a) }));

const getReservationById = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  getReservationById: (...a: unknown[]) => getReservationById(...a),
}));

const signComprobanteUrl = vi.fn();
vi.mock("@/lib/reservation/comprobante.server", () => ({
  signComprobanteUrl: (...a: unknown[]) => signComprobanteUrl(...a),
}));

import { GET } from "@/app/api/admin/reservations/[id]/comprobante/route";

const ctx = { params: Promise.resolve({ id: "abc" }) };
const req = () => new Request("http://t/api/admin/reservations/abc/comprobante");

beforeEach(() => {
  vi.clearAllMocks();
  getAdminUser.mockResolvedValue({ email: "a@a.com" });
  getReservationById.mockResolvedValue({ id: "abc", comprobante_path: "CDL-1/x.jpg" });
  signComprobanteUrl.mockResolvedValue("https://storage.example/signed?token=1");
});

describe("GET /api/admin/reservations/[id]/comprobante", () => {
  it("firma el link recién al pedirlo y redirige al archivo", async () => {
    const res = await GET(req(), ctx);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://storage.example/signed?token=1");
    expect(signComprobanteUrl).toHaveBeenCalledWith("CDL-1/x.jpg");
  });

  it("401 sin admin, sin tocar la base", async () => {
    getAdminUser.mockResolvedValue(null);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(401);
    expect(getReservationById).not.toHaveBeenCalled();
  });

  it("404 si la reserva no tiene comprobante", async () => {
    getReservationById.mockResolvedValue({ id: "abc", comprobante_path: null });
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
    expect(signComprobanteUrl).not.toHaveBeenCalled();
  });

  it("502 si no se pudo firmar", async () => {
    signComprobanteUrl.mockResolvedValue(null);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(502);
  });
});
