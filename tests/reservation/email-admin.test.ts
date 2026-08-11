import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () { return { emails: { send } }; }),
}));

import {
  notifyAdminNewReservation,
  alertAdminPaymentWithoutSlot,
} from "@/lib/reservation/email/admin";

const NUEVA = {
  code: "CDL-2026-AB12",
  unitName: "Cabaña Aratirí",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54 9 376 000000",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  nights: 3,
  guests: 4,
  total: 480000,
  paymentMethod: "card" as const,
};

const CRITICA = {
  code: "CDL-2026-AB12",
  paymentId: "pay-9",
  unitName: "Cabaña Aratirí",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54 9 376 000000",
  total: 480000,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CDL_ADMIN_EMAIL", "dueño@lago.test");
  vi.stubEnv("ADMIN_EMAILS", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lacasadellago.test");
  send.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("destinatario", () => {
  it("usa CDL_ADMIN_EMAIL cuando está", async () => {
    await notifyAdminNewReservation(NUEVA);
    expect(send.mock.calls[0][0].to).toBe("dueño@lago.test");
  });

  it("sin CDL_ADMIN_EMAIL cae a la primera entrada de ADMIN_EMAILS", async () => {
    // Un deploy ya configurado no puede quedarse sin la alerta crítica por una
    // variable nueva que nadie sabía que había que agregar.
    vi.stubEnv("CDL_ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", " panel@lago.test , otro@lago.test ");
    await notifyAdminNewReservation(NUEVA);
    expect(send.mock.calls[0][0].to).toBe("panel@lago.test");
  });

  it("sin ninguna de las dos, no envía y no lanza", async () => {
    vi.stubEnv("CDL_ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", "");
    await expect(notifyAdminNewReservation(NUEVA)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("notifyAdminNewReservation", () => {
  it("tarjeta: asunto de reserva confirmada", async () => {
    await notifyAdminNewReservation(NUEVA);
    const arg = send.mock.calls[0][0];
    expect(arg.subject).toContain("CDL-2026-AB12");
    expect(arg.subject).not.toContain("Revisar comprobante");
  });

  it("transferencia: el asunto pide revisar el comprobante", async () => {
    // Es la diferencia que importa: la transferencia necesita una acción humana.
    await notifyAdminNewReservation({ ...NUEVA, paymentMethod: "transfer" });
    expect(send.mock.calls[0][0].subject).toContain("Revisar comprobante");
  });

  it("manual: no avisa, el dueño acaba de cargarla él mismo", async () => {
    // ReservationRow.payment_method incluye "manual" (reservas cargadas a mano
    // desde el panel). Avisarle al dueño de su propia acción es ruido, y el
    // ruido en este buzón hace que deje de mirarlo.
    await notifyAdminNewReservation({ ...NUEVA, paymentMethod: "manual" });
    expect(send).not.toHaveBeenCalled();
  });

  it("lleva los datos de contacto del huésped y el link al panel", async () => {
    await notifyAdminNewReservation(NUEVA);
    const arg = send.mock.calls[0][0];
    expect(arg.html).toContain("juan@test.com");
    expect(arg.html).toContain("Juan Pérez");
    expect(arg.html).toContain("https://lacasadellago.test/admin/reservas");
    expect(arg.text).toContain("480.000");
  });

  it("escapa HTML en campos del huésped (anti-inyección)", async () => {
    await notifyAdminNewReservation({ ...NUEVA, lastName: "<script>x</script>" });
    const html = send.mock.calls[0][0].html;
    expect(html).not.toContain("<script>x</script>");
    // No alcanza con que el crudo no aparezca: hay que verificar que el dato
    // sobrevive escapado, no que el campo se borró silenciosamente.
    expect(html).toContain("&lt;script&gt;");
  });

  it("fail-soft: si Resend rechaza, no lanza", async () => {
    send.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(notifyAdminNewReservation(NUEVA)).resolves.toBeUndefined();
  });
});

describe("alertAdminPaymentWithoutSlot", () => {
  it("marca urgencia y nombra el pago de Mercado Pago", async () => {
    await alertAdminPaymentWithoutSlot(CRITICA);
    const arg = send.mock.calls[0][0];
    expect(arg.subject).toContain("URGENTE");
    expect(arg.html).toContain("pay-9");
  });

  it("dice las dos salidas: reembolsar o reubicar", async () => {
    await alertAdminPaymentWithoutSlot(CRITICA);
    const arg = send.mock.calls[0][0];
    expect(arg.html.toLowerCase()).toContain("reembolsar");
    expect(arg.html.toLowerCase()).toContain("reubicar");
    expect(arg.text.toLowerCase()).toContain("reembolsar");
  });
});
