import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

const getPayment = vi.fn();
vi.mock("@/lib/reservation/payments.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reservation/payments.server")>(
    "@/lib/reservation/payments.server",
  );
  return { ...actual, getPayment: (...a: unknown[]) => getPayment(...a) };
});

const { OverlapError, upsertConfirmedByCode } = vi.hoisted(() => {
  class OverlapError extends Error {
    constructor() {
      super("overlap");
      this.name = "OverlapError";
    }
  }
  return { OverlapError, upsertConfirmedByCode: vi.fn() };
});
vi.mock("@/lib/reservation/reservations.server", () => ({
  upsertConfirmedByCode: (...a: unknown[]) => upsertConfirmedByCode(...a),
  OverlapError,
}));

const sendConfirmationEmailOnce = vi.fn();
vi.mock("@/lib/reservation/email.server", () => ({
  sendConfirmationEmailOnce: (...a: unknown[]) => sendConfirmationEmailOnce(...a),
}));

import { POST } from "@/app/api/webhooks/mercadopago/route";

const SECRET = "test-secret";
const APPROVED_PAYMENT = {
  id: "pay-1",
  status: "approved",
  externalReference: "CDL-2026-AB12",
  metadata: {
    unit_id: "aguaribay", unit_name: "Cabaña Aguaribay", first_name: "Juan", last_name: "Pérez",
    email: "juan@test.com", phone: "+54", guests: 4,
    check_in: "2026-07-02", check_out: "2026-07-05", nights: 3, total: 815,
  },
};

function req(dataId: string, requestId: string, valid: boolean) {
  const ts = "1700000000";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = valid
    ? crypto.createHmac("sha256", SECRET).update(manifest).digest("hex")
    : "deadbeef";
  return new Request("http://t/api/webhooks/mercadopago", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    },
    body: JSON.stringify({ type: "payment", data: { id: dataId } }),
  });
}

function approvedReq() {
  return req("pay-1", "req-1", true);
}

beforeEach(() => {
  getPayment.mockReset();
  getPayment.mockResolvedValue(APPROVED_PAYMENT);
  upsertConfirmedByCode.mockReset();
  upsertConfirmedByCode.mockResolvedValue(undefined);
  sendConfirmationEmailOnce.mockReset();
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
});
afterEach(() => { delete process.env.MERCADOPAGO_WEBHOOK_SECRET; });

describe("POST /api/webhooks/mercadopago", () => {
  it("401 si la firma es inválida", async () => {
    const res = await POST(req("pay-1", "req-1", false));
    expect(res.status).toBe(401);
    expect(getPayment).not.toHaveBeenCalled();
    expect(upsertConfirmedByCode).not.toHaveBeenCalled();
  });

  it("pago aprobado: confirma por code y responde ok", async () => {
    const res = await POST(approvedReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
    const row = upsertConfirmedByCode.mock.calls[0][0];
    expect(row.code).toBe("CDL-2026-AB12");
    expect(row.paymentId).toBe("pay-1");
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith("CDL-2026-AB12");
  });

  it("fechas tomadas al confirmar: loguea y responde ok (sin error a MP)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    upsertConfirmedByCode.mockRejectedValueOnce(new OverlapError());
    const res = await POST(approvedReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    errSpy.mockRestore();
  });

  it("pago no aprobado → 200 sin confirmar", async () => {
    getPayment.mockResolvedValue({ ...APPROVED_PAYMENT, status: "rejected" });
    const res = await POST(req("pay-1", "req-1", true));
    expect(res.status).toBe(200);
    expect(upsertConfirmedByCode).not.toHaveBeenCalled();
  });
});
