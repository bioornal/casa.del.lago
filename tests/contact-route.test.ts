import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/reservation/email/client", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

import { POST } from "@/app/api/contact/route";

function request(body: unknown, ip = String(Math.random())) {
  return new Request("http://t/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CDL_ADMIN_EMAIL", "admin@lago.test");
  sendEmail.mockResolvedValue(true);
});

describe("POST /api/contact", () => {
  it("envía la consulta al admin y configura reply-to al visitante", async () => {
    const response = await POST(request({
      name: "Ana",
      email: "ana@example.com",
      phone: "+54",
      dates: "20 al 23 de agosto",
      message: "Hola, quisiera consultar disponibilidad.",
    }));
    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "admin@lago.test",
      replyTo: "ana@example.com",
      subject: expect.stringContaining("Ana"),
    }));
  });

  it("rechaza datos inválidos", async () => {
    const response = await POST(request({ name: "Ana", email: "no-es-email", message: "Hola" }));
    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("responde ok al honeypot sin enviar correo", async () => {
    const response = await POST(request({ website: "bot", name: "Bot", email: "bot@example.com", message: "spam" }));
    expect(response.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
