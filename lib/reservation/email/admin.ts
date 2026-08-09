import { sendEmail } from "./client";
import { esc, money } from "./format";
import type { PaymentMethod } from "@/lib/reservation/reservations.server";

/**
 * Emails operativos al dueño. Español siempre, sin i18n y sin branding: se
 * leen desde el teléfono para decidir si hay que hacer algo, no para admirarlos.
 */

/**
 * Destinatario del aviso. CDL_ADMIN_EMAIL es la variable propia; ADMIN_EMAILS
 * es la allowlist de acceso al panel y sirve de red: sin ese fallback, un
 * deploy que ya andaba se queda sin la alerta crítica por una variable nueva
 * que nadie sabía que había que agregar.
 */
function adminTo(): string | null {
  const propia = (process.env.CDL_ADMIN_EMAIL ?? "").trim();
  if (propia) return propia;

  const delPanel = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)[0];
  if (delPanel) return delPanel;

  console.warn("[email] CDL_ADMIN_EMAIL y ADMIN_EMAILS ausentes; no se avisa al dueño");
  return null;
}

function rowsToHtml(rows: [string, string][]): string {
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td>` +
        `<td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`,
    )
    .join("");
}

function panelUrl(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/reservas`;
}

export type AdminNewReservationInput = {
  code: string;
  unitName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: number;
  paymentMethod: PaymentMethod;
};

export async function notifyAdminNewReservation(i: AdminNewReservationInput): Promise<void> {
  // "manual" es una reserva que el dueño cargó a mano desde el panel: avisarle
  // de su propia acción es ruido, y el ruido acá hace que deje de mirar el buzón
  // justo cuando llegue la alerta que importa.
  if (i.paymentMethod === "manual") return;

  const to = adminTo();
  if (!to) return;

  const isTransfer = i.paymentMethod === "transfer";
  const subject = isTransfer
    ? `[Revisar comprobante] ${i.code} — ${i.unitName}`
    : `Reserva confirmada ${i.code} — ${i.unitName}`;

  const headline = isTransfer
    ? "Reserva por transferencia, pendiente de revisión del comprobante."
    : "Reserva pagada con tarjeta. Ya está confirmada y agendada.";

  const rows: [string, string][] = [
    ["Código", i.code],
    ["Alojamiento", i.unitName],
    ["Check-in", i.checkIn],
    ["Check-out", i.checkOut],
    ["Noches", String(i.nights)],
    ["Huéspedes", String(i.guests)],
    ["Total", money(i.total)],
    ["Huésped", `${i.firstName} ${i.lastName}`],
    ["Email", i.email],
    ["Teléfono", i.phone || "—"],
  ];

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">
  <p>${headline}</p>
  <table style="border-collapse:collapse">${rowsToHtml(rows)}</table>
  <p style="margin-top:18px"><a href="${panelUrl()}">Abrir el panel de reservas</a></p>
</div>`;

  const text = `${headline}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nPanel: ${panelUrl()}`;

  await sendEmail({ to, subject, html, text });
}

export type AdminCriticalAlertInput = {
  code: string;
  paymentId: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  total: number;
};

/**
 * Pago aprobado sobre fechas que ya estaban ocupadas: plata cobrada sin
 * reserva. Deliberadamente SIN deduplicación — que llegue dos veces es
 * molesto, que no llegue cuesta dinero.
 */
export async function alertAdminPaymentWithoutSlot(i: AdminCriticalAlertInput): Promise<void> {
  const to = adminTo();
  if (!to) return;

  const rows: [string, string][] = [
    ["Pago (MP)", i.paymentId],
    ["Código", i.code],
    ["Alojamiento", i.unitName],
    ["Check-in", i.checkIn],
    ["Check-out", i.checkOut],
    ["Total cobrado", money(i.total)],
    ["Huésped", `${i.firstName} ${i.lastName}`],
    ["Email", i.email],
    ["Teléfono", i.phone || "—"],
  ];

  const headline =
    "Mercado Pago aprobó un pago, pero las fechas ya estaban ocupadas: " +
    "el cobro se hizo y NO hay reserva.";
  const salidas =
    "Hay dos salidas: <strong>reembolsar</strong> el pago desde el panel de " +
    "Mercado Pago, o <strong>reubicar</strong> al huésped en otra unidad o " +
    "fecha y cargar la reserva a mano. Contactalo cuanto antes.";

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">
  <p style="font-size:16px"><strong>${headline}</strong></p>
  <table style="border-collapse:collapse">${rowsToHtml(rows)}</table>
  <p style="margin-top:18px">${salidas}</p>
</div>`;

  const text =
    `${headline}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n` +
    "Hay dos salidas: reembolsar el pago desde el panel de Mercado Pago, o " +
    "reubicar al huésped en otra unidad o fecha y cargar la reserva a mano.";

  await sendEmail({ to, subject: `[URGENTE] Pago aprobado sin fechas disponibles — ${i.code}`, html, text });
}
