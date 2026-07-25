export type BookingIcsInput = {
  code: string;
  unitName: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
};

/** RFC 5545 §3.3.11: en los valores de texto hay que escapar \ ; , y saltos. */
function escText(s: string): string {
  return s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

/** YYYY-MM-DD → YYYYMMDD */
function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function icsStamp(now: Date): string {
  return `${now.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * Evento de día completo desde el check-in hasta el check-out.
 *
 * - DTEND en all-day es exclusivo, así que coincide exactamente con la fecha
 *   de check-out sin sumarle un día.
 * - METHOD:PUBLISH y no REQUEST: es informativo, no le pedimos RSVP al huésped.
 * - El UID sale del código de reserva: si el huésped reenvía o recibe de nuevo
 *   el email, el calendario actualiza el evento en vez de duplicarlo.
 */
export function buildBookingIcs(input: BookingIcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Casa del Lago Urugua-í//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.code}@lacasadellagouruguai.com`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${icsDate(input.checkIn)}`,
    `DTEND;VALUE=DATE:${icsDate(input.checkOut)}`,
    `SUMMARY:${escText(`La Casa del Lago Urugua-í — ${input.unitName}`)}`,
    "LOCATION:Lago Urugua-í, Misiones, Argentina",
    `DESCRIPTION:${escText(`Código de reserva: ${input.code}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
