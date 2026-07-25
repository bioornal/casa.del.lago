import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () { return { emails: { send } }; }),
}));

const markConfirmationEmailSent = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  markConfirmationEmailSent: (...a: unknown[]) => markConfirmationEmailSent(...a),
}));

import { sendConfirmationEmailOnce, sendReleaseEmail } from "@/lib/reservation/email/guest";

const ROW = {
  code: "CDL-2026-AB12", unit_name: "Cabaña Aratiri", first_name: "Juan",
  email: "juan@test.com",
  check_in: "2026-07-02", check_out: "2026-07-05", nights: 3, guests: 4,
  total: 480000, locale: "es",
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
  });

  it("sin RESEND_API_KEY → no envía ni marca, no lanza", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(markConfirmationEmailSent).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("adjunta el .ics de la reserva", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    const [att] = send.mock.calls[0][0].attachments;
    expect(att.filename).toBe("cdl-cdl-2026-ab12.ics");
    expect(att.contentType).toContain("text/calendar");
    expect(Buffer.from(att.content, "base64").toString("utf8")).toContain("BEGIN:VEVENT");
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
});
