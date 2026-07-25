import { esc, money } from "./format";

export type EmailLocale = "es" | "en" | "pt";

export type ConfirmationEmailInput = {
  code: string;
  unitName: string;
  firstName: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  guests: number;
  total: number;
  locale: EmailLocale;
  miReservaUrl: string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

const LOCALE_TAG: Record<EmailLocale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

type Copy = {
  subject: (code: string) => string;
  greeting: (name: string) => string;
  intro: string;
  labels: { code: string; unit: string; checkIn: string; checkOut: string; nights: string; guests: string; total: string };
  cta: string;
  outro: string;
  footer: string;
};

const COPY: Record<EmailLocale, Copy> = {
  es: {
    subject: (c) => `Reserva confirmada — ${c}`,
    greeting: (n) => `Hola ${n},`,
    intro: "Tu reserva en La Casa del Lago Urugua-í está confirmada. ¡Te esperamos!",
    labels: { code: "Código", unit: "Alojamiento", checkIn: "Check-in", checkOut: "Check-out", nights: "Noches", guests: "Huéspedes", total: "Total" },
    cta: "Ver mi reserva",
    outro: "Ante cualquier consulta, respondé este correo o escribinos por WhatsApp.",
    footer: "La Casa del Lago Urugua-í · Lago Urugua-í, Misiones",
  },
  en: {
    subject: (c) => `Booking confirmed — ${c}`,
    greeting: (n) => `Hi ${n},`,
    intro: "Your booking at La Casa del Lago Urugua-í is confirmed. We look forward to hosting you!",
    labels: { code: "Code", unit: "Accommodation", checkIn: "Check-in", checkOut: "Check-out", nights: "Nights", guests: "Guests", total: "Total" },
    cta: "View my booking",
    outro: "If you have any questions, reply to this email or message us on WhatsApp.",
    footer: "La Casa del Lago Urugua-í · Lake Urugua-í, Misiones, Argentina",
  },
  pt: {
    subject: (c) => `Reserva confirmada — ${c}`,
    greeting: (n) => `Olá ${n},`,
    intro: "Sua reserva na La Casa del Lago Urugua-í está confirmada. Esperamos por você!",
    labels: { code: "Código", unit: "Acomodação", checkIn: "Check-in", checkOut: "Check-out", nights: "Noites", guests: "Hóspedes", total: "Total" },
    cta: "Ver minha reserva",
    outro: "Em caso de dúvidas, responda este e-mail ou fale conosco pelo WhatsApp.",
    footer: "La Casa del Lago Urugua-í · Lago Urugua-í, Misiones, Argentina",
  },
};

function fmtDate(iso: string, locale: EmailLocale): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** Renderiza filas [label, value] como <tr> de la tabla de detalle. */
function renderRows(rows: [string, string][]): string {
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b665d;font-size:14px">${k}</td>` +
        `<td style="padding:8px 0;text-align:right;color:#23362B;font-size:14px;font-weight:600">${v}</td></tr>`,
    )
    .join("");
}

/**
 * Envoltorio HTML compartido: doctype/body, paleta, título "La Casa del Lago Urugua-í" y footer.
 */
function renderEnvelope(greeting: string, intro: string, body: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F8F5F0;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <h1 style="font-size:22px;color:#23362B;margin:0 0 4px">La Casa del Lago Urugua-í</h1>
  <p style="font-size:15px;color:#23362B;margin:18px 0 4px">${greeting}</p>
  <p style="font-size:15px;color:#5b5347;line-height:1.6;margin:0 0 22px">${intro}</p>
  ${body}
  <p style="font-size:12px;color:#9a9388;border-top:1px solid #ece5d8;padding-top:16px;margin:0">${footer}</p>
</div>
</body></html>`;
}

export function buildConfirmationEmail(input: ConfirmationEmailInput): BuiltEmail {
  const locale: EmailLocale = (["es", "en", "pt"] as const).includes(input.locale)
    ? input.locale
    : "es";
  const t = COPY[locale];
  const name = esc(input.firstName);
  const unit = esc(input.unitName);
  const ci = fmtDate(input.checkIn, locale);
  const co = fmtDate(input.checkOut, locale);
  const tot = money(input.total);

  const rows: [string, string][] = [
    [t.labels.code, esc(input.code)],
    [t.labels.unit, unit],
    [t.labels.checkIn, ci],
    [t.labels.checkOut, co],
    [t.labels.nights, String(input.nights)],
    [t.labels.guests, String(input.guests)],
    [t.labels.total, tot],
  ];

  const rowsHtml = renderRows(rows);

  const body = `<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #ece5d8;border-radius:8px;padding:8px 18px">
    ${rowsHtml}
  </table>
  <div style="text-align:center;margin:26px 0">
    <a href="${input.miReservaUrl}" style="display:inline-block;background:#A04B2A;color:#F8F5F0;text-decoration:none;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:14px 28px;border-radius:4px">${t.cta}</a>
  </div>
  <p style="font-size:13px;color:#6b665d;line-height:1.6;margin:0 0 18px">${t.outro}</p>`;

  const html = renderEnvelope(t.greeting(name), t.intro, body, t.footer);

  const textRows = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const text = `${t.greeting(input.firstName)}\n\n${t.intro}\n\n${textRows}\n\n${t.cta}: ${input.miReservaUrl}\n\n${t.outro}\n${t.footer}`;

  return { subject: t.subject(input.code), html, text };
}

export type ReleaseEmailInput = {
  code: string;
  unitName: string;
  firstName: string;
  checkIn: string;
  checkOut: string;
  locale: EmailLocale;
  whatsappUrl: string;
};

type ReleaseCopy = {
  subject: (code: string) => string;
  greeting: (name: string) => string;
  intro: string;
  labels: { code: string; unit: string; checkIn: string; checkOut: string };
  cta: string;
  outro: string;
  footer: string;
};

/**
 * Tono deliberado: no acusatorio. El huésped puede haber pagado bien y haber
 * fallado nosotros al conciliar. Nunca decimos "rechazado" ni "inválido".
 */
const RELEASE_COPY: Record<EmailLocale, ReleaseCopy> = {
  es: {
    subject: (c) => `No pudimos confirmar tu reserva — ${c}`,
    greeting: (n) => `Hola ${n},`,
    intro:
      "No logramos identificar el pago de tu reserva en La Casa del Lago Urugua-í, así que liberamos las fechas para no retenerlas sin confirmar.",
    labels: { code: "Código", unit: "Alojamiento", checkIn: "Check-in", checkOut: "Check-out" },
    cta: "Escribinos por WhatsApp",
    outro:
      "Si ya hiciste la transferencia o creés que hubo un error de nuestra parte, respondé este correo o escribinos por WhatsApp: lo revisamos y, si las fechas siguen libres, te las reservamos de nuevo.",
    footer: "La Casa del Lago Urugua-í · Lago Urugua-í, Misiones",
  },
  en: {
    subject: (c) => `We could not confirm your booking — ${c}`,
    greeting: (n) => `Hi ${n},`,
    intro:
      "We could not identify the payment for your booking at La Casa del Lago Urugua-í, so we released the dates rather than hold them unconfirmed.",
    labels: { code: "Code", unit: "Accommodation", checkIn: "Check-in", checkOut: "Check-out" },
    cta: "Message us on WhatsApp",
    outro:
      "If you already sent the transfer, or you think something went wrong on our end, reply to this email or message us on WhatsApp: we will look into it and, if the dates are still open, hold them for you again.",
    footer: "La Casa del Lago Urugua-í · Lake Urugua-í, Misiones, Argentina",
  },
  pt: {
    subject: (c) => `Não conseguimos confirmar sua reserva — ${c}`,
    greeting: (n) => `Olá ${n},`,
    intro:
      "Não conseguimos identificar o pagamento da sua reserva na La Casa del Lago Urugua-í, então liberamos as datas em vez de mantê-las sem confirmação.",
    labels: { code: "Código", unit: "Acomodação", checkIn: "Check-in", checkOut: "Check-out" },
    cta: "Fale conosco pelo WhatsApp",
    outro:
      "Se você já fez a transferência, ou acha que houve um erro da nossa parte, responda este e-mail ou fale conosco pelo WhatsApp: vamos verificar e, se as datas ainda estiverem livres, reservamos novamente para você.",
    footer: "La Casa del Lago Urugua-í · Lago Urugua-í, Misiones, Argentina",
  },
};

export function buildReleaseEmail(input: ReleaseEmailInput): BuiltEmail {
  const locale: EmailLocale = (["es", "en", "pt"] as const).includes(input.locale)
    ? input.locale
    : "es";
  const t = RELEASE_COPY[locale];

  const rows: [string, string][] = [
    [t.labels.code, esc(input.code)],
    [t.labels.unit, esc(input.unitName)],
    [t.labels.checkIn, fmtDate(input.checkIn, locale)],
    [t.labels.checkOut, fmtDate(input.checkOut, locale)],
  ];

  const rowsHtml = renderRows(rows);

  const body = `<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #ece5d8;border-radius:8px;padding:8px 18px">
    ${rowsHtml}
  </table>
  <p style="font-size:13px;color:#6b665d;line-height:1.6;margin:22px 0 18px">${t.outro}</p>
  <div style="text-align:center;margin:26px 0">
    <a href="${input.whatsappUrl}" style="display:inline-block;background:#A04B2A;color:#F8F5F0;text-decoration:none;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:14px 28px;border-radius:4px">${t.cta}</a>
  </div>`;

  const html = renderEnvelope(t.greeting(esc(input.firstName)), t.intro, body, t.footer);

  const textRows = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const text = `${t.greeting(input.firstName)}\n\n${t.intro}\n\n${textRows}\n\n${t.outro}\n\n${t.cta}: ${input.whatsappUrl}\n${t.footer}`;

  return { subject: t.subject(input.code), html, text };
}
