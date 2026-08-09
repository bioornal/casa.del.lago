import { esc, money } from "./format";

import { bucketSrc } from "@/components/ui/ImageSlot";
import { CHECK_IN, CHECK_OUT } from "@/lib/site";

export type EmailLocale = "es" | "en" | "pt";

// ── Paleta del lago ────────────────────────────────────────────────────────
// Adaptada de app/globals.css. No se usan las variables CSS: los clientes de
// email no resuelven custom properties, todo va hexadecimal literal.
const COLOR_PAGE = "#f1ece3"; // arena clara: fondo detrás de la tarjeta
const COLOR_CARD = "#FFFFFF";
const COLOR_BAND = "#f5eee1"; // marfil: franja del logo y del pie
const COLOR_INK = "#155e75"; // lago: franja de estado y titulares
const COLOR_INTRO = "#5b5347";
const COLOR_MUTED = "#6b665d";
const COLOR_FAINT = "#9a9388";
const COLOR_BORDER = "#eae0ce"; // arena
const COLOR_ACCENT = "#a24b2a"; // terracota
const COLOR_SAGE = "#1fa2b8"; // turquesa: sobre la franja lago

// Georgia y Arial, no la Fraunces del sitio: los clientes de email ignoran o
// bloquean webfonts, así que se usa la serif ubicua más cercana.
const FONT_SERIF = "Georgia,'Times New Roman',Times,serif";
const FONT_SANS = "Arial,Helvetica,sans-serif";

const CARD_W = 560;

// Assets decorativos y opcionales: si falta la variable no se renderiza el
// bloque, y el dato viaja igual como texto. Nunca cae a un placeholder de
// Unsplash — en un mail de confirmación sería peor que no poner nada.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
// Variante marfil: va sobre la franja lago, que es oscura.
const LOGO_URL = SITE_URL ? `${SITE_URL}/logo-lago-marfil.png` : null;
const HERO_URL =
  process.env.NEXT_PUBLIC_PHOTOS_BUCKET_READY === "1" ? bucketSrc("hero/hero2.jpg") : null;

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
  /** Link de WhatsApp prellenado con el código. Opcional: sin él no se
   *  renderiza el link, y el template sigue válido para inputs viejos. */
  whatsappUrl?: string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

const LOCALE_TAG: Record<EmailLocale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

type Copy = {
  subject: (code: string) => string;
  greeting: (name: string) => string;
  intro: string;
  labels: { code: string; unit: string; checkIn: string; checkOut: string; nights: string; guests: string; total: string };
  cta: string;
  /** Etiqueta del link de WhatsApp. Misma redacción que RELEASE_COPY.cta. */
  waCta: string;
  /** Texto de la franja de estado, sobre el código de reserva. */
  badge: string;
  /** Preposiciones de horario: "desde 15:00" / "hasta 10:00". */
  from: string;
  until: string;
  /** Menciona el .ics adjunto, que se manda desde siempre y nadie abría. */
  icsNote: string;
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
    waCta: "Escribinos por WhatsApp",
    badge: "Reserva confirmada",
    from: "desde",
    until: "hasta",
    icsNote: "Adjuntamos la reserva como archivo de calendario: abrilo para agendarla.",
    outro: "Ante cualquier consulta, respondé este correo o escribinos por WhatsApp.",
    footer: "La Casa del Lago Urugua-í · Lago Urugua-í, Misiones",
  },
  en: {
    subject: (c) => `Booking confirmed — ${c}`,
    greeting: (n) => `Hi ${n},`,
    intro: "Your booking at La Casa del Lago Urugua-í is confirmed. We look forward to hosting you!",
    labels: { code: "Code", unit: "Accommodation", checkIn: "Check-in", checkOut: "Check-out", nights: "Nights", guests: "Guests", total: "Total" },
    cta: "View my booking",
    waCta: "Message us on WhatsApp",
    badge: "Booking confirmed",
    from: "from",
    until: "until",
    icsNote: "We've attached your booking as a calendar file: open it to add it to your agenda.",
    outro: "If you have any questions, reply to this email or message us on WhatsApp.",
    footer: "La Casa del Lago Urugua-í · Lake Urugua-í, Misiones, Argentina",
  },
  pt: {
    subject: (c) => `Reserva confirmada — ${c}`,
    greeting: (n) => `Olá ${n},`,
    intro: "Sua reserva na La Casa del Lago Urugua-í está confirmada. Esperamos por você!",
    labels: { code: "Código", unit: "Acomodação", checkIn: "Check-in", checkOut: "Check-out", nights: "Noites", guests: "Hóspedes", total: "Total" },
    cta: "Ver minha reserva",
    waCta: "Fale conosco pelo WhatsApp",
    badge: "Reserva confirmada",
    from: "a partir das",
    until: "até",
    icsNote: "Anexamos a reserva como arquivo de calendário: abra para adicioná-la à sua agenda.",
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

/**
 * Esqueleto del mail: tabla de ancho fijo, no un div con max-width. Outlook de
 * escritorio renderiza con el motor de Word, que ignora max-width, y el mail se
 * estiraba a toda la ventana.
 */
function renderShell(opts: {
  badge: string;
  badgeSub?: string;
  hero: boolean;
  body: string;
  footer: string;
}): string {
  const heroRow =
    opts.hero && HERO_URL
      ? `<tr><td style="padding:0;font-size:0;line-height:0">
        <img src="${HERO_URL}" width="${CARD_W}" alt="" style="display:block;width:100%;max-width:${CARD_W}px;height:auto;border:0" />
      </td></tr>`
      : "";

  const logoRow = LOGO_URL
    ? `<img src="${LOGO_URL}" width="150" alt="La Casa del Lago Urugua-í" style="display:block;border:0;height:auto" />`
    : `<div style="font-family:${FONT_SERIF};font-size:19px;color:${COLOR_INK}">La Casa del Lago Urugua-í</div>`;

  const badgeSub = opts.badgeSub
    ? `<div style="font-family:${FONT_SANS};font-size:15px;letter-spacing:.18em;color:${COLOR_SAGE};margin:8px 0 0">${opts.badgeSub}</div>`
    : "";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>La Casa del Lago Urugua-í</title></head>
<body style="margin:0;padding:0;background:${COLOR_PAGE};-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR_PAGE}">
  <tr>
    <td align="center" style="padding:28px 12px">
      <table role="presentation" width="${CARD_W}" cellpadding="0" cellspacing="0" border="0" style="width:${CARD_W}px;max-width:100%;border-collapse:collapse">

        <tr>
          <td align="center" style="background:${COLOR_BAND};padding:26px 24px 22px">
            ${logoRow}
          </td>
        </tr>

        ${heroRow}

        <tr>
          <td align="center" style="background:${COLOR_INK};padding:22px 24px">
            <div style="font-family:${FONT_SERIF};font-size:21px;color:${COLOR_BAND};letter-spacing:.02em">${opts.badge}</div>
            ${badgeSub}
          </td>
        </tr>

        <tr>
          <td style="background:${COLOR_CARD};padding:32px 30px 28px">
            ${opts.body}
          </td>
        </tr>

        <tr>
          <td align="center" style="background:${COLOR_BAND};padding:20px 24px;border-top:1px solid ${COLOR_BORDER}">
            <div style="font-family:${FONT_SANS};font-size:12px;color:${COLOR_FAINT};line-height:1.7">${opts.footer}</div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Bloque de estadía: las dos fechas que importan, una al lado de la otra, con
 * su horario. Es lo primero que el huésped busca al reabrir el mail meses
 * después, así que va arriba y con más peso que el resto del detalle.
 */
function renderStay(opts: {
  checkInLabel: string; checkOutLabel: string;
  checkInDate: string; checkOutDate: string;
  fromLabel: string; untilLabel: string;
}): string {
  const cell = (label: string, date: string, time: string) =>
    `<td width="50%" style="padding:16px 14px;vertical-align:top">
      <div style="font-family:${FONT_SANS};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${COLOR_MUTED}">${label}</div>
      <div style="font-family:${FONT_SERIF};font-size:18px;color:${COLOR_INK};margin:6px 0 3px;line-height:1.3">${date}</div>
      <div style="font-family:${FONT_SANS};font-size:12px;color:${COLOR_MUTED}">${time}</div>
    </td>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${COLOR_BORDER};border-radius:8px;background:${COLOR_BAND};margin:0 0 22px">
    <tr>
      ${cell(opts.checkInLabel, opts.checkInDate, `${opts.fromLabel} ${CHECK_IN}`)}
      ${cell(opts.checkOutLabel, opts.checkOutDate, `${opts.untilLabel} ${CHECK_OUT}`)}
    </tr>
  </table>`;
}

/** Filas de detalle. La última puede destacarse: es el total. */
function renderDetailRows(rows: [string, string][], emphasizeLast = false): string {
  const last = rows.length - 1;
  const html = rows
    .map(([k, v], i) => {
      const strong = emphasizeLast && i === last;
      const border = i === last ? "none" : `1px solid ${COLOR_BORDER}`;
      return `<tr>
        <td style="padding:11px 0;border-bottom:${border};font-family:${FONT_SANS};font-size:13px;color:${COLOR_MUTED}">${k}</td>
        <td align="right" style="padding:11px 0;border-bottom:${border};font-family:${strong ? FONT_SERIF : FONT_SANS};font-size:${strong ? "20px" : "13px"};color:${COLOR_INK};font-weight:${strong ? "400" : "600"}">${v}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 24px">${html}</table>`;
}

/**
 * Botón CTA como tabla, con el padding sobre el `<a>`: Outlook ignora el
 * padding de un `<a>` suelto y el botón queda como texto plano subrayado.
 */
function renderCta(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px">
    <tr>
      <td align="center" style="background:${COLOR_ACCENT};border-radius:4px">
        <a href="${url}" style="display:inline-block;padding:14px 32px;font-family:${FONT_SANS};font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${COLOR_BAND};text-decoration:none">${label}</a>
      </td>
    </tr>
  </table>`;
}

function renderGreeting(greeting: string, intro: string): string {
  return `<div style="font-family:${FONT_SERIF};font-size:23px;color:${COLOR_INK};margin:0 0 10px">${greeting}</div>
    <p style="font-family:${FONT_SANS};font-size:14px;color:${COLOR_INTRO};line-height:1.7;margin:0 0 24px">${intro}</p>`;
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

  // El código sube a la franja de estado y las fechas van al bloque de estadía,
  // así que acá queda solo el detalle secundario. Antes eran siete filas con el
  // mismo peso, donde el código —lo único que el huésped busca al reabrir el
  // mail meses después— pesaba igual que "Noches: 1".
  const rows: [string, string][] = [
    [t.labels.unit, unit],
    [t.labels.nights, String(input.nights)],
    [t.labels.guests, String(input.guests)],
    [t.labels.total, tot],
  ];

  // El outro invita a escribir por WhatsApp: sin este link, el huésped se queda
  // sin a dónde ir. Va debajo del outro, separado del CTA principal.
  const waHtml = input.whatsappUrl
    ? `<br /><a href="${input.whatsappUrl}" style="color:${COLOR_ACCENT};text-decoration:none;font-weight:600">${t.waCta} →</a>`
    : "";

  const body = `${renderGreeting(t.greeting(name), t.intro)}
    ${renderStay({
      checkInLabel: t.labels.checkIn, checkOutLabel: t.labels.checkOut,
      checkInDate: ci, checkOutDate: co,
      fromLabel: t.from, untilLabel: t.until,
    })}
    ${renderDetailRows(rows, true)}
    ${renderCta(input.miReservaUrl, t.cta)}
    <p style="font-family:${FONT_SANS};font-size:12px;color:${COLOR_MUTED};line-height:1.7;margin:0 0 18px;text-align:center">${t.icsNote}</p>
    <p style="font-family:${FONT_SANS};font-size:13px;color:${COLOR_MUTED};line-height:1.7;margin:0;border-top:1px solid ${COLOR_BORDER};padding-top:18px">
      ${t.outro}${waHtml}
    </p>`;

  const html = renderShell({
    badge: t.badge,
    badgeSub: esc(input.code),
    hero: true,
    body,
    footer: t.footer,
  });

  // El texto plano conserva las siete filas: sin maqueta no hay jerarquía que
  // preservar, y el código tiene que estar sí o sí.
  const textRows = [
    [t.labels.code, input.code],
    [t.labels.unit, input.unitName],
    [t.labels.checkIn, `${ci} (${t.from} ${CHECK_IN})`],
    [t.labels.checkOut, `${co} (${t.until} ${CHECK_OUT})`],
    [t.labels.nights, String(input.nights)],
    [t.labels.guests, String(input.guests)],
    [t.labels.total, tot],
  ]
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const waLine = input.whatsappUrl ? `\n${t.waCta}: ${input.whatsappUrl}` : "";
  const text = `${t.badge.toUpperCase()}\n\n${t.greeting(input.firstName)}\n\n${t.intro}\n\n${textRows}\n\n${t.cta}: ${input.miReservaUrl}\n\n${t.icsNote}\n\n${t.outro}${waLine}\n\n${t.footer}`;

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
  /** Franja de estado. Enuncia el hecho, sin adjetivar al huésped. */
  badge: string;
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
    badge: "Reserva no confirmada",
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
    badge: "Booking not confirmed",
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
    badge: "Reserva não confirmada",
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

  // El código sube a la franja, igual que en la confirmación; abajo queda qué
  // fechas se liberaron. Sin `renderStay`: ese bloque anuncia una estadía, y acá
  // justamente no la hay.
  const body = `${renderGreeting(t.greeting(esc(input.firstName)), t.intro)}
    ${renderDetailRows(rows.slice(1))}
    ${renderCta(input.whatsappUrl, t.cta)}
    <p style="font-family:${FONT_SANS};font-size:13px;color:${COLOR_MUTED};line-height:1.7;margin:0;border-top:1px solid ${COLOR_BORDER};padding-top:18px">${t.outro}</p>`;

  // Sin foto de portada: para una mala noticia es el tono equivocado.
  const html = renderShell({
    badge: t.badge,
    badgeSub: esc(input.code),
    hero: false,
    body,
    footer: t.footer,
  });

  const textRows = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const text = `${t.badge.toUpperCase()}\n\n${t.greeting(input.firstName)}\n\n${t.intro}\n\n${textRows}\n\n${t.outro}\n\n${t.cta}: ${input.whatsappUrl}\n${t.footer}`;

  return { subject: t.subject(input.code), html, text };
}
