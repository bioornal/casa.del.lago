import { markConfirmationEmailSent } from "@/lib/reservation/reservations.server";
import type { ReservationRow } from "@/lib/reservation/reservations.server";
import { buildConfirmationEmail, buildReleaseEmail, type EmailLocale } from "./guest-templates";
import { sendEmail } from "./client";
import { buildBookingIcs } from "@/lib/reservation/ics-build";
import { waLink } from "@/lib/contact";
import { notifyAdminNewReservation } from "./admin";

function normLocale(v: unknown): EmailLocale {
  return v === "en" || v === "pt" ? v : "es";
}

/**
 * Envía el email de confirmación al huésped, exactamente una vez por reserva.
 * - Deduplica vía markConfirmationEmailSent (flip atómico en Supabase).
 * - Sin RESEND_API_KEY: no-op SIN marcar, para no perder el envío al configurar.
 */
export async function sendConfirmationEmailOnce(code: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY ausente; no se envía confirmación (code ${code})`);
    return;
  }

  try {
    const row = await markConfirmationEmailSent(code);
    if (!row) return; // ya enviado o code inexistente

    const locale = normLocale(row.locale);
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const miReservaUrl = `${base}/${locale}/mi-reserva?code=${encodeURIComponent(row.code)}`;

    const { subject, html, text } = buildConfirmationEmail({
      code: row.code,
      unitName: row.unit_name,
      firstName: row.first_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: row.nights,
      guests: row.guests,
      total: row.total,
      locale,
      miReservaUrl,
      whatsappUrl: waLink(`Hola, escribo por la reserva ${row.code}`),
    });

    const ics = buildBookingIcs({
      code: row.code,
      unitName: row.unit_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
    });

    await sendEmail({
      to: row.email,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `cdl-${row.code.toLowerCase()}.ics`,
          content: Buffer.from(ics, "utf8").toString("base64"),
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ],
    });

    // El aviso al dueño va acá y no en las rutas: este bloque ya corre una sola
    // vez por reserva (flip atómico de markConfirmationEmailSent) y la fila ya
    // tiene todo. Cablearlo en el checkout y en el webhook mandaría dos.
    //
    // Excepción: si payment_method es "transfer", el único camino que llega
    // hasta acá es app/api/admin/reservations/[id]/route.ts confirmando a mano
    // (exige r.payment_method === "transfer" para la acción "confirm"). El aviso
    // "[Revisar comprobante]" ya salió cuando el huésped subió el comprobante
    // (transfer/route.ts); avisarle de nuevo acá sería avisarle de su propia
    // acción recién hecha en el panel — el mismo ruido que el caso "manual".
    if (row.payment_method !== "transfer") {
      await notifyAdminNewReservation({
        code: row.code,
        unitName: row.unit_name,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone ?? "",
        checkIn: row.check_in,
        checkOut: row.check_out,
        nights: row.nights,
        guests: row.guests,
        total: row.total,
        paymentMethod: row.payment_method,
      });
    }
  } catch (err) {
    console.error(
      `[email] confirmación falló (code ${code}):`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Avisa al huésped que liberamos sus fechas.
 *
 * Recibe la fila que el call site ya tiene: sin consulta extra. No lleva
 * deduplicación propia porque la transición de estado a "released" ocurre
 * una sola vez.
 */
export async function sendReleaseEmail(row: ReservationRow): Promise<void> {
  const locale = normLocale(row.locale);
  const { subject, html, text } = buildReleaseEmail({
    code: row.code,
    unitName: row.unit_name,
    firstName: row.first_name,
    checkIn: row.check_in,
    checkOut: row.check_out,
    locale,
    whatsappUrl: waLink(`Hola, escribo por la reserva ${row.code}`),
  });
  await sendEmail({ to: row.email, subject, html, text });
}
