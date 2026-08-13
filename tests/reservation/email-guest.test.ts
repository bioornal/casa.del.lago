import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () { return { emails: { send } }; }),
}));

const markConfirmationEmailSent = vi.fn();
const unmarkConfirmationEmailSent = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  markConfirmationEmailSent: (...a: unknown[]) => markConfirmationEmailSent(...a),
  unmarkConfirmationEmailSent: (...a: unknown[]) => unmarkConfirmationEmailSent(...a),
}));

const notifyAdminNewReservation = vi.fn();
vi.mock("@/lib/reservation/email/admin", () => ({
  notifyAdminNewReservation: (...a: unknown[]) => notifyAdminNewReservation(...a),
}));

import { sendConfirmationEmailOnce, sendReleaseEmail } from "@/lib/reservation/email/guest";

const ROW = {
  code: "CDL-2026-AB12", unit_name: "Cabaña Aratiri", first_name: "Juan",
  last_name: "Pérez", phone: "+54 9 376 000000", payment_method: "card",
  email: "juan@test.com",
  check_in: "2026-07-02", check_out: "2026-07-05", nights: 3, guests: 4,
  total: 480000, locale: "es",
  confirmation_email_sent_at: "2026-08-13T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CDL_EMAIL_FROM", "Lago <test@lago.test>");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lacasadellago.test");
  send.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("sendConfirmationEmailOnce", () => {
  it("flip ganado → envía una vez con los datos correctos", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(send).toHaveBeenCalledOnce();
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe("juan@test.com");
    expect(arg.subject).toContain("CDL-2026-AB12");
    expect(arg.html).toContain("https://lacasadellago.test/es/mi-reserva?code=CDL-2026-AB12");
  });

  it("flip no ganado (null) → no envía (dedup)", async () => {
    markConfirmationEmailSent.mockResolvedValue(null);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(send).not.toHaveBeenCalled();
  });

  it("fail-soft: si Resend rechaza, no lanza", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    send.mockRejectedValue(new Error("resend down"));
    await expect(sendConfirmationEmailOnce("CDL-2026-AB12")).resolves.toBeUndefined();
    expect(unmarkConfirmationEmailSent).toHaveBeenCalledWith("CDL-2026-AB12", ROW.confirmation_email_sent_at);
  });

  it("sin RESEND_API_KEY → no envía ni marca, no lanza", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(markConfirmationEmailSent).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("incluye el link de WhatsApp prellenado con el código", async () => {
    // El texto del mail invita a escribir por WhatsApp; sin link, el huésped
    // se queda sin a dónde ir.
    markConfirmationEmailSent.mockResolvedValue(ROW);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    const arg = send.mock.calls[0][0];
    expect(arg.html).toContain("wa.me");
    expect(arg.html).toContain("CDL-2026-AB12");
    expect(arg.text).toContain("wa.me");
  });

  it("adjunta el .ics de la reserva", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    const [att] = send.mock.calls[0][0].attachments;
    expect(att.filename).toBe("cdl-cdl-2026-ab12.ics");
    expect(att.contentType).toContain("text/calendar");
    expect(Buffer.from(att.content, "base64").toString("utf8")).toContain("BEGIN:VEVENT");
  });

  it("avisa al dueño con los datos de la fila", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(notifyAdminNewReservation).toHaveBeenCalledOnce();
    expect(notifyAdminNewReservation.mock.calls[0][0]).toMatchObject({
      code: "CDL-2026-AB12",
      lastName: "Pérez",
      paymentMethod: "card",
      total: 480000,
    });
  });

  it("payment_method transfer → NO avisa al dueño (ya se avisó al subir el comprobante)", async () => {
    // El único camino que confirma una transferencia es el panel de admin
    // (app/api/admin/reservations/[id]/route.ts, que exige payment_method ===
    // "transfer"). El aviso "[Revisar comprobante]" ya salió cuando el huésped
    // subió el comprobante; repetirlo acá sería avisarle al dueño de la acción
    // que él mismo acaba de hacer en el panel.
    markConfirmationEmailSent.mockResolvedValue({ ...ROW, payment_method: "transfer" });
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(send).toHaveBeenCalledOnce(); // el huésped sí recibe su confirmación
    expect(notifyAdminNewReservation).not.toHaveBeenCalled();
  });

  it("flip no ganado → tampoco avisa al dueño (dedup compartida)", async () => {
    // El checkout y el webhook confirman la misma reserva: sin esta guarda
    // llegan dos avisos.
    markConfirmationEmailSent.mockResolvedValue(null);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(notifyAdminNewReservation).not.toHaveBeenCalled();
  });

  it("si el mail al huésped falla, el dueño se entera igual", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    send.mockResolvedValue({ data: null, error: { message: "nope" } });
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(notifyAdminNewReservation).toHaveBeenCalledOnce();
  });
});

describe("sendReleaseEmail", () => {
  const ROW_FULL = { ...ROW, id: "r1", unit_id: "aratiri", last_name: "Pérez", phone: "+549..." };

  it("envía al huésped en su idioma", async () => {
    // @ts-expect-error fila parcial
    await sendReleaseEmail(ROW_FULL);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].to).toBe("juan@test.com");
    expect(send.mock.calls[0][0].subject).toContain("CDL-2026-AB12");
  });

  it("no deduplica por columna: la transición a released ya es única", async () => {
    // @ts-expect-error fila parcial
    await sendReleaseEmail(ROW_FULL);
    expect(markConfirmationEmailSent).not.toHaveBeenCalled();
  });

  it("fail-soft: si Resend rechaza, no lanza", async () => {
    // Avisar es best-effort. Las fechas YA se liberaron en la base cuando se
    // llama a esto: que Resend falle no puede tumbar la operación.
    send.mockRejectedValue(new Error("resend down"));
    // @ts-expect-error fila parcial
    await expect(sendReleaseEmail(ROW_FULL)).resolves.toBeUndefined();
  });
});
