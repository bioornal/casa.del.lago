// Datos de contacto reales del alojamiento — único lugar donde viven.
// Datos públicos de contacto de La Casa del Lago Urugua-í.

export const WHATSAPP_NUMBER = "5493757446156";
export const CONTACT_PHONE_DISPLAY = "+54 9 3757 446156";
export const CONTACT_EMAIL = "lacasadellagourugua-i@gmail.com";
export const CONTACT_PHONE_HREF = "tel:+5493757446156";

/** Link a WhatsApp, opcionalmente con mensaje prellenado. */
export function waLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
