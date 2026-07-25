// @vitest-environment node
// Esta ruta sube FormData con un File real; el polyfill de File de jsdom
// (entorno default del proyecto) reporta `size` incorrecto al parsear
// multipart vía Request.formData(). El entorno "node" usa el File nativo
// de undici, donde el tamaño se preserva correctamente.
import { describe, it, expect, vi, beforeEach } from "vitest";

const uploadComprobante = vi.fn();
const removeComprobante = vi.fn();
vi.mock("@/lib/reservation/comprobante.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reservation/comprobante.server")>(
    "@/lib/reservation/comprobante.server",
  );
  return {
    ...actual,
    uploadComprobante: (...a: unknown[]) => uploadComprobante(...a),
    removeComprobante: (...a: unknown[]) => removeComprobante(...a),
  };
});

const { OverlapError } = vi.hoisted(() => {
  class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
  return { OverlapError };
});
const insertReservation = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  OverlapError,
}));

// Tarifas: siempre los defaults — el test no depende de la DB ni del admin.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

vi.mock("@/lib/site-settings.server", () => ({
  getBookingMode: vi.fn(async () => "online" as const),
}));

import { POST } from "@/app/api/reservations/transfer/route";

function form(fields: Record<string, string>, file?: File) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  if (file) fd.append("comprobante", file);
  return new Request("http://t/api/reservations/transfer", { method: "POST", body: fd });
}

const VALID = {
  unitId: "aguaribay", checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "4",
  firstName: "Juan", lastName: "Pérez", email: "juan@test.com", phone: "+54",
  locale: "pt",
};
const goodFile = () => new File([new Uint8Array([1, 2, 3])], "c.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  uploadComprobante.mockResolvedValue("comprobantes/x.jpg");
  removeComprobante.mockResolvedValue(undefined);
  insertReservation.mockResolvedValue(undefined);
});

describe("POST /api/reservations/transfer", () => {
  it("inserta pending y responde 200 con code", async () => {
    const res = await POST(form(VALID, goodFile()));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("pending");
    expect(body.code).toMatch(/^CDL-\d{4}-[A-Z2-9]{4}$/);
    expect(insertReservation).toHaveBeenCalledOnce();
    expect(insertReservation.mock.calls[0][0].status).toBe("pending");
    expect(insertReservation.mock.calls[0][0].paymentMethod).toBe("transfer");
  });

  it("responde 409 y borra el comprobante si las fechas se solapan", async () => {
    insertReservation.mockRejectedValueOnce(new OverlapError());
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("conflict");
    expect(removeComprobante).toHaveBeenCalledWith("comprobantes/x.jpg");
  });

  it("400 si falta el comprobante", async () => {
    const res = await POST(form(VALID));
    expect(res.status).toBe(400);
    expect(uploadComprobante).not.toHaveBeenCalled();
  });

  it("400 si el tipo de archivo no está permitido", async () => {
    const bad = new File([new Uint8Array([1])], "c.txt", { type: "text/plain" });
    const res = await POST(form(VALID, bad));
    expect(res.status).toBe(400);
  });

  it("400 si el archivo supera 6 MB", async () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024 + 1)], "c.jpg", { type: "image/jpeg" });
    const res = await POST(form(VALID, big));
    expect(res.status).toBe(400);
  });

  it("400 si el payload de reserva es inválido", async () => {
    const res = await POST(form({ ...VALID, email: "no-es-email" }, goodFile()));
    expect(res.status).toBe(400);
  });

  it("502 si la subida del comprobante falla (no llega a insertar)", async () => {
    uploadComprobante.mockRejectedValue(new Error("storage down"));
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(502);
    expect(insertReservation).not.toHaveBeenCalled();
  });

  it("502 + borra el comprobante si el insert falla por un error que no es overlap", async () => {
    insertReservation.mockRejectedValue(new Error("db down"));
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(502);
    expect(removeComprobante).toHaveBeenCalledWith("comprobantes/x.jpg");
  });

  it("propaga locale al insert (default es si falta o es inválido)", async () => {
    await POST(form(VALID, goodFile()));
    expect(insertReservation.mock.calls[0][0].locale).toBe("pt");

    const { locale: _omit, ...noLocale } = VALID;
    await POST(form(noLocale, goodFile()));
    expect(insertReservation.mock.calls[1][0].locale).toBe("es");

    await POST(form({ ...VALID, locale: "xx" }, goodFile()));
    expect(insertReservation.mock.calls[2][0].locale).toBe("es");
  });
});
