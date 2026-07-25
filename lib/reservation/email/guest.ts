import { markConfirmationEmailSent } from "@/lib/reservation/reservations.server";
import type { ReservationRow } from "@/lib/reservation/reservations.server";
import { buildConfirmationEmail, buildReleaseEmail, type EmailLocale } from "./guest-templates";
import { sendEmail } from "./client";
import { buildBookingIcs } from "@/lib/reservation/ics-build";
import { waLink } from "@/lib/contact";

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
