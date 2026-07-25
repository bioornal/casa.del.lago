import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () { return { emails: { send } }; }),
}));

import { sendEmail } from "@/lib/reservation/email/client";

const INPUT = { to: "juan@test.com", subject: "Hola", html: "<p>Hola</p>", text: "Hola" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CDL_EMAIL_FROM", "Lago <test@lago.test>");
  vi.stubEnv("CDL_EMAIL_REPLY_TO", "");
  send.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("sendEmail", () => {
  it("envía con el from configurado y devuelve true", async () => {
    const ok = await sendEmail(INPUT);
    expect(ok).toBe(true);
    const arg = send.mock.calls[0][0];
    expect(arg.from).toBe("Lago <test@lago.test>");
    expect(arg.to).toBe("juan@test.com");
    expect(arg.subject).toBe("Hola");
  });

  it("agrega replyTo solo si la env var está seteada", async () => {
    await sendEmail(INPUT);
    expect(send.mock.calls[0][0].replyTo).toBeUndefined();

    vi.stubEnv("CDL_EMAIL_REPLY_TO", "dueno@test.com");
    await sendEmail(INPUT);
    expect(send.mock.calls[1][0].replyTo).toBe("dueno@test.com");
  });

  it("pasa los adjuntos tal cual", async () => {
    await sendEmail({ ...INPUT, attachments: [{ filename: "r.ics", content: "YmFzZTY0" }] });
    expect(send.mock.calls[0][0].attachments).toEqual([{ filename: "r.ics", content: "YmFzZTY0" }]);
  });

  it("sin RESEND_API_KEY → no envía y devuelve false", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendEmail(INPUT)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("si Resend devuelve error → false, no lanza", async () => {
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    expect(await sendEmail(INPUT)).toBe(false);
  });

  it("si Resend tira → false, no lanza", async () => {
    send.mockRejectedValue(new Error("resend down"));
    await expect(sendEmail(INPUT)).resolves.toBe(false);
  });
});
