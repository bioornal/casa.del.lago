// Helpers del panel para contactar al huésped desde el celular: el dueño opera
// sólo desde el teléfono, así que el número de cada reserva tiene que poder
// tocarse para llamar o abrir WhatsApp.

/** Link de WhatsApp al huésped, o null si el número no alcanza para armarlo. */
export function guestWhatsAppLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const international = phone.trim().startsWith("+");
  let digits = phone.replace(/\D/g, "");
  if (!international && !digits.startsWith("54")) {
    // Formato local argentino: 0 de larga distancia + "15" del celular.
    if (digits.startsWith("0")) digits = digits.slice(1);
    const fifteen = digits.match(/^(\d{2,4})15(\d{6,8})$/);
    if (fifteen && fifteen[1].length + fifteen[2].length === 10) digits = fifteen[1] + fifteen[2];
    if (digits.length === 10) digits = `549${digits}`;
  }
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

/** Link tel: con sólo dígitos (y el + si venía), o null si está vacío. */
export function guestTelLink(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  const plus = phone.trim().startsWith("+") ? "+" : "";
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:${plus}${digits}` : null;
}

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * "2026-11-05" → "jue 5 nov". Se arma a mano (no Intl) y desde las partes de
 * la fecha: así no depende del ICU del servidor ni se corre un día por UTC.
 */
export function formatStayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
