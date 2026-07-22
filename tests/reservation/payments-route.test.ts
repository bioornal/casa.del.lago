import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createCardPayment = vi.fn();
vi.mock("@/lib/reservation/payments.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reservation/payments.server")>(
    "@/lib/reservation/payments.server",
  );
  return {
    ...actual,
    createCardPayment: (...a: unknown[]) => createCardPayment(...a),
  };
});

const { OverlapError } = vi.hoisted(() => {
  class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
  return { OverlapError };
});
const insertReservation = vi.fn();
const upsertConfirmedByCode = vi.fn();
const setReservationStatusByCode = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  upsertConfirmedByCode: (...a: unknown[]) => upsertConfirmedByCode(...a),
  setReservationStatusByCode: (...a: unknown[]) => setReservationStatusByCode(...a),
  OverlapError,
}));

const sendConfirmationEmailOnce = vi.fn();
vi.mock("@/lib/reservation/email.server", () => ({
  sendConfirmationEmailOnce: (...a: unknown[]) => sendConfirmationEmailOnce(...a),
}));

// Tarifas: siempre los defaults — el test no depende de la DB ni del admin.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

import { POST } from "@/app/api/payments/route";

const CARD = { token: "tok-1", paymentMethodId: "visa", installments: 1 };
const VALID = {
  unitId: "aguaribay",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  guests: 4,
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54",
  payment: CARD,
};

function post(body: unknown) {
  return new Request("http://t/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createCardPayment.mockReset();
  insertReservation.mockReset();
  insertReservation.mockResolvedValue(undefined);
  upsertConfirmedByCode.mockReset();
  upsertConfirmedByCode.mockResolvedValue(undefined);
  setReservationStatusByCode.mockReset();
  setReservationStatusByCode.mockResolvedValue(undefined);
  sendConfirmationEmailOnce.mockReset();
  delete process.env.PAYMENTS_MOCK;
});
afterEach(() => { delete process.env.PAYMENTS_MOCK; });

describe("POST /api/payments", () => {
  it("409 sin cobrar si las fechas están tomadas (OverlapError antes del cobro)", async () => {
    process.env.PAYMENTS_MOCK = "1";
    insertReservation.mockRejectedValueOnce(new OverlapError());
    const res = await POST(post({ ...VALID, payment: { mockOutcome: "approved" } }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("conflict");
    // no se cobró ni se confirmó nada
    expect(createCardPayment).not.toHaveBeenCalled();
    expect(upsertConfirmedByCode).not.toHaveBeenCalled();
  });

  it("502 si el insert de la retención falla por un error que no es overlap", async () => {
    insertReservation.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
    expect(createCardPayment).not.toHaveBeenCalled();
  });

  it("approved → retiene, cobra y confirma por code", async () => {
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(body.code).toMatch(/^CDL-\d{4}-[A-Z2-9]{4}$/);
    expect(insertReservation.mock.calls[0][0].status).toBe("pending");
    expect(insertReservation.mock.calls[0][0].paymentMethod).toBe("card");
    expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
    expect(upsertConfirmedByCode.mock.calls[0][0].paymentId).toBe("pay-1");
    expect(setReservationStatusByCode).not.toHaveBeenCalled();
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith(expect.stringMatching(/^CDL-/));
  });

  it("cobra el total recalculado server-side, ignorando lo que mande el cliente", async () => {
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    await POST(post({ ...VALID, amount: 1, total: 1 }));
    // aguaribay 3 noches, precio de lista (tarjeta): 95.000 ÷ 0,923 → $103.000/noche
    // × 3 + limpieza grosseada $32.600 = $341.600 (ver method-pricing.ts)
    expect(createCardPayment.mock.calls[0][0].amount).toBe(341600);
  });

  it("rejected → libera la retención por code, responde 200 rejected", async () => {
    createCardPayment.mockResolvedValue({ id: "pay-2", status: "rejected", statusDetail: "cc_rejected" });
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("rejected");
    expect(setReservationStatusByCode).toHaveBeenCalledWith(expect.any(String), "released");
    expect(upsertConfirmedByCode).not.toHaveBeenCalled();
  });

  it("pending → deja la fila en pending, no confirma ni libera", async () => {
    createCardPayment.mockResolvedValue({ id: "pay-3", status: "in_process" });
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
    expect(upsertConfirmedByCode).not.toHaveBeenCalled();
    expect(setReservationStatusByCode).not.toHaveBeenCalled();
  });

  it("400 si el payload de reserva es inválido", async () => {
    const res = await POST(post({ ...VALID, email: "no-es-email" }));
    expect(res.status).toBe(400);
    expect(createCardPayment).not.toHaveBeenCalled();
    expect(insertReservation).not.toHaveBeenCalled();
  });

  it("400 si falta el método de pago", async () => {
    const { payment: _omit, ...noPay } = VALID;
    const res = await POST(post(noPay));
    expect(res.status).toBe(400);
  });

  it("502 y libera la retención si el cobro lanza", async () => {
    createCardPayment.mockRejectedValue(new Error("mp down"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
    expect(setReservationStatusByCode).toHaveBeenCalledWith(expect.any(String), "released");
  });

  it("modo mock: mockOutcome approved confirma sin llamar a MP", async () => {
    process.env.PAYMENTS_MOCK = "1";
    const res = await POST(post({ ...VALID, payment: { mockOutcome: "approved" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
    expect(createCardPayment).not.toHaveBeenCalled();
    expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
  });

  it("mockOutcome se ignora si PAYMENTS_MOCK está apagado (400 sin token)", async () => {
    const res = await POST(post({ ...VALID, payment: { mockOutcome: "approved" } }));
    expect(res.status).toBe(400);
  });

  it("approved sigue 200 aunque la confirmación en Supabase falle (best-effort)", async () => {
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    upsertConfirmedByCode.mockRejectedValue(new Error("db down"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
  });

  it("pending → la fila de retención queda con paymentMethod card / status pending", async () => {
    createCardPayment.mockResolvedValue({ id: "pay-3", status: "in_process" });
    await POST(post(VALID));
    expect(insertReservation).toHaveBeenCalledOnce();
    expect(insertReservation.mock.calls[0][0].status).toBe("pending");
    expect(insertReservation.mock.calls[0][0].paymentMethod).toBe("card");
  });
});
