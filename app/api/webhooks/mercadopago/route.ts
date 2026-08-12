import { NextResponse } from "next/server";
import { getPayment, verifyWebhookSignature } from "@/lib/reservation/payments.server";
import { upsertConfirmedByCode, OverlapError, releasePendingByCode, type Locale } from "@/lib/reservation/reservations.server";
import { sendConfirmationEmailOnce } from "@/lib/reservation/email/guest";
import { alertAdminPaymentWithoutSlot } from "@/lib/reservation/email/admin";
import { TEST_UNIT_ID } from "@/lib/reservation/test-unit";
import type { UnitId } from "@/lib/reservation/reducer";

// TEST_UNIT_ID entra SIN consultar el flag isTestUnitEnabled, a propósito:
// Mercado Pago puede entregar esta notificación minutos después del cobro,
// cuando el toggle de /admin/configuracion ya se apagó. Si acá se consultara
// el flag, se mataría este segundo camino de confirmación (webhook, además
// del retorno síncrono de /api/payments) — que es justamente uno de los
// efectos que la unidad de prueba viene a verificar. No agrega riesgo: para
// llegar a este punto el cobro ya ocurrió.
const VALID_UNITS: UnitId[] = ["aratiri", "aguaribay", TEST_UNIT_ID];

export async function POST(req: Request) {
  let body: { type?: string; data?: { id?: string } };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const dataId = body.data?.id;
  if (!dataId) return NextResponse.json({ ok: true }); // nada que procesar

  const ok = verifyWebhookSignature({
    signatureHeader: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId: String(dataId),
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
  });
  if (!ok) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  if (body.type !== "payment") return NextResponse.json({ ok: true });

  let payment;
  try {
    payment = await getPayment(String(dataId));
  } catch (err) {
    console.error("[webhook] getPayment fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "fetch" }, { status: 502 });
  }

  const code = payment.externalReference;

  // Rechazo/cancelación terminal: liberar el hold pending (auto-sanación del
  // caso tarjeta in_process -> rejected). Solo afecta filas pending.
  if (payment.status === "rejected" || payment.status === "cancelled") {
    if (code) {
      try { await releasePendingByCode(String(code)); }
      catch (err) { console.error("[webhook] release hold fallo:", err instanceof Error ? err.message : err); }
    }
    return NextResponse.json({ ok: true });
  }

  // pending/in_process/otros no terminales: dejar el hold como está.
  if (payment.status !== "approved") return NextResponse.json({ ok: true });

  if (!code) return NextResponse.json({ ok: true }); // sin external_reference; nada que hacer

  const m = (payment.metadata ?? {}) as Record<string, unknown>;
  const unitId = m.unit_id;
  if (typeof unitId !== "string" || !(VALID_UNITS as string[]).includes(unitId)) {
    return NextResponse.json({ ok: true }); // metadata incompleta; nada que hacer
  }

  const upsertInput = {
    code,
    unitId: unitId as UnitId,
    unitName: String(m.unit_name),
    checkIn: String(m.check_in),
    checkOut: String(m.check_out),
    nights: Number(m.nights),
    guests: Number(m.guests),
    firstName: String(m.first_name),
    lastName: String(m.last_name),
    email: String(m.email),
    phone: String(m.phone ?? ""),
    total: Number(m.total),
    paymentId: String(payment.id),
    locale: (m.locale === "en" || m.locale === "pt" ? m.locale : "es") as Locale,
  };

  try {
    await upsertConfirmedByCode(upsertInput);
  } catch (err) {
    if (err instanceof OverlapError) {
      // El console.error se conserva como última red: el mail puede no salir
      // (sin RESEND_API_KEY, sin destinatario configurado, Resend caído) y
      // esta plata ya se cobró sin que exista una reserva.
      console.error(`[webhook] pago ${payment.id} aprobado pero fechas ocupadas (code ${code}); requiere reembolso manual`);
      // Try/catch propio: sendEmail no lanza hoy, pero si esto alguna vez lo
      // hiciera, un throw acá tumbaría el POST → Mercado Pago reintenta el
      // webhook → OverlapError de nuevo → alerta de nuevo → 500 de nuevo. Un
      // bucle de reintentos sobre plata ya cobrada, sin que el dueño se entere
      // nunca (el catch de afuera nunca se alcanza).
      try {
        await alertAdminPaymentWithoutSlot({
          code,
          paymentId: String(payment.id),
          unitName: upsertInput.unitName,
          checkIn: upsertInput.checkIn,
          checkOut: upsertInput.checkOut,
          firstName: upsertInput.firstName,
          lastName: upsertInput.lastName,
          email: upsertInput.email,
          phone: upsertInput.phone,
          total: upsertInput.total,
        });
      } catch (alertErr) {
        console.error(
          "[webhook] alerta crítica falló:",
          alertErr instanceof Error ? alertErr.message : alertErr,
        );
      }
      return NextResponse.json({ ok: true });
    }
    console.error("[webhook] persist supabase fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true });
  }

  try { await sendConfirmationEmailOnce(code); }
  catch (err) { console.error("[webhook] email fallo:", err instanceof Error ? err.message : err); }

  return NextResponse.json({ ok: true });
}
