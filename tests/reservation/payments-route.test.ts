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
const generateUniqueBookingCode = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  upsertConfirmedByCode: (...a: unknown[]) => upsertConfirmedByCode(...a),
  setReservationStatusByCode: (...a: unknown[]) => setReservationStatusByCode(...a),
  generateUniqueBookingCode: (...a: unknown[]) => generateUniqueBookingCode(...a),
  OverlapError,
}));

const sendConfirmationEmailOnce = vi.fn();
// email/guest exporta sendConfirmationEmailOnce Y sendReleaseEmail: aunque esta
// ruta solo use la primera, el factory devuelve las dos para no dejar la otra
// undefined si algún día se importa desde acá.
vi.mock("@/lib/reservation/email/guest", () => ({
  sendConfirmationEmailOnce: (...a: unknown[]) => sendConfirmationEmailOnce(...a),
  sendReleaseEmail: vi.fn(),
}));

// Tarifas: siempre los defaults — el test no depende de la DB ni del admin.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

// Factory completo a propósito (misma trampa que en availability-route.test.ts):
// si el módulo bajo prueba importa algo de site-settings.server que acá falta,
// queda en undefined en runtime. getBookingMode se reusa tal cual ya estaba
// (no se declara otro); se importa más abajo para poder pisarlo con
// mockResolvedValue en los tests que lo necesitan.
vi.mock("@/lib/site-settings.server", () => ({
  getBookingMode: vi.fn(async () => "online" as const),
  isTestUnitEnabled: vi.fn(),
}));

import { getBookingMode, isTestUnitEnabled } from "@/lib/site-settings.server";
import { POST } from "@/app/api/payments/route";

const mockedGetBookingMode = vi.mocked(getBookingMode);
const mockedIsTestUnitEnabled = vi.mocked(isTestUnitEnabled);

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

// IP única por request por default (mismo patrón que lookup-route.test.ts):
// el contador de rate-limit es un mapa en memoria que persiste entre los
// tests del archivo, así que sin esto los casos existentes empiezan a
// compartir cupo con el bucket "payments" y dan 429 según el orden en que corran.
function post(body: unknown, ip: string = String(Math.random())) {
  return new Request("http://t/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createCardPayment.mockReset();
  // mockReset() borraría también el default async () => "online" que trae el
  // factory de arriba: hay que reponerlo, si no las reservas reales de los
  // tests existentes (que no tocan este mock) quedarían con booking mode
  // undefined y el corte de WhatsApp las bloquearía por accidente.
  mockedGetBookingMode.mockReset();
  mockedGetBookingMode.mockResolvedValue("online");
  // Cerrado por default (fail-safe, mismo criterio que isTestUnitEnabled real):
  // los tests que no piden la unidad de prueba no dependen de este valor.
  mockedIsTestUnitEnabled.mockReset();
  mockedIsTestUnitEnabled.mockResolvedValue(false);
  insertReservation.mockReset();
  insertReservation.mockResolvedValue(undefined);
  upsertConfirmedByCode.mockReset();
  upsertConfirmedByCode.mockResolvedValue(undefined);
  setReservationStatusByCode.mockReset();
  setReservationStatusByCode.mockResolvedValue(undefined);
  sendConfirmationEmailOnce.mockReset();
  generateUniqueBookingCode.mockReset();
  // Alfabeto sin 0/O ni 1/I (ver lib/reservation/code.ts): "AB23" respeta el
  // regex /^CDL-\d{4}-[A-Z2-9]{4}$/ que ya verifican los tests de forma.
  generateUniqueBookingCode.mockResolvedValue("CDL-2026-AB23");
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
    // generateBookingCode() sortea sobre 32^4 sin mirar la base. El código es la
    // clave del lookup, del email y del flip de dedup: dos reservas con el mismo
    // código se pisan.
    expect(generateUniqueBookingCode).toHaveBeenCalledOnce();
    expect(insertReservation.mock.calls[0][0].status).toBe("pending");
    expect(insertReservation.mock.calls[0][0].paymentMethod).toBe("card");
    expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
    expect(upsertConfirmedByCode.mock.calls[0][0].paymentId).toBe("pay-1");
    expect(setReservationStatusByCode).not.toHaveBeenCalled();
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith(expect.stringMatching(/^CDL-/));
  });

  it("502 si no se consigue un código libre, sin cobrar", async () => {
    generateUniqueBookingCode.mockRejectedValueOnce(new Error("sin códigos libres"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("code");
    expect(createCardPayment).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("cobra el total recalculado server-side, ignorando lo que mande el cliente", async () => {
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    await POST(post({ ...VALID, amount: 1, total: 1 }));
    // VALID son 4 huéspedes: base $99.800 + $40.000 = $139.800 netos;
    // tarjeta → $151.500/noche × 3 + limpieza $30.000 = $484.500.
    expect(createCardPayment.mock.calls[0][0].amount).toBe(484500);
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

  it("502: si el release tras fallo de cobro también falla, igual responde 502 (no 500)", async () => {
    createCardPayment.mockRejectedValue(new Error("mp down"));
    setReservationStatusByCode.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("payment");
  });

  it("rejected: si el release falla, igual responde rejected (no 500)", async () => {
    process.env.PAYMENTS_MOCK = "1";
    setReservationStatusByCode.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(post({ ...VALID, payment: { mockOutcome: "rejected" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("rejected");
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

  it("429 al superar el techo de pedidos por IP", async () => {
    // Mismo mecanismo que en transfer y lookup: el límite es por IP y por ventana.
    // El máximo de la ruta es 10 (ver rateLimited("payments", ..., 10, ...)):
    // hay que probar que las primeras 10 pasan y recién la 11ª se bloquea, no
    // solo que la última de una tanda cualquiera da 429 (eso pasaría igual si
    // la ruta devolviera 429 siempre).
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    const ip = "198.51.100.23";
    for (let i = 0; i < 10; i++) {
      const res = await POST(post(VALID, ip));
      expect(res.status).not.toBe(429);
    }
    const blocked = await POST(post(VALID, ip));
    expect(blocked.status).toBe(429);
  });

  it("con el flag apagado, la unidad de prueba se rechaza como cualquier basura", async () => {
    mockedIsTestUnitEnabled.mockResolvedValue(false);
    const res = await POST(post({ ...VALID, unitId: "prueba" }));
    expect(res.status).toBe(400);
    expect(createCardPayment).not.toHaveBeenCalled();
  });

  it("con el flag prendido cobra el monto plano, no el de una unidad real", async () => {
    // El monto lo recalcula el server con checkoutTotal: nunca viaja del cliente.
    mockedIsTestUnitEnabled.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    await POST(post({ ...VALID, unitId: "prueba" }));
    expect(createCardPayment.mock.calls[0][0].amount).toBe(2500);
  });

  it("la unidad de prueba saltea el corte de modo WhatsApp", async () => {
    // Es el escenario de uso: probar el cobro con el sitio cerrado al público.
    mockedIsTestUnitEnabled.mockResolvedValue(true);
    mockedGetBookingMode.mockResolvedValue("whatsapp");
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    const res = await POST(post({ ...VALID, unitId: "prueba" }));
    expect(res.status).not.toBe(503);
  });

  it("con el flag prendido, una unidad real NO saltea el corte", async () => {
    // Si el flag global alcanzara, prenderlo abriría el checkout de las
    // unidades reales a cualquiera con un deep-link.
    mockedIsTestUnitEnabled.mockResolvedValue(true);
    mockedGetBookingMode.mockResolvedValue("whatsapp");
    const res = await POST(post(VALID));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("bookings_paused");
  });

  it("con el flag apagado, 'prueba' en modo WhatsApp da 503 igual que cualquier otro id", async () => {
    // Antes del fix, el corte solo miraba el unitId (nunca el flag): con el
    // flag apagado, "prueba" colaba distinto (400) que un id inexistente
    // (503) — un prober podía usar el status code para saber que la unidad
    // de prueba existe. Las dos condiciones tienen que dar la MISMA respuesta.
    mockedIsTestUnitEnabled.mockResolvedValue(false);
    mockedGetBookingMode.mockResolvedValue("whatsapp");
    const res = await POST(post({ ...VALID, unitId: "prueba" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("bookings_paused");
    expect(createCardPayment).not.toHaveBeenCalled();
  });
});
