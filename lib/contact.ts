// Datos de contacto reales del alojamiento — único lugar donde viven.
// TODO(adaptación): reemplazar por el WhatsApp y email reales de La Casa del Lago Urugua-í.

export const WHATSAPP_NUMBER = "549XXXXXXXXXX"; // TODO: número real (formato wa.me, sin +)
export const CONTACT_EMAIL = "info@lacasadellago.com.ar"; // TODO: email real
export const CONTACT_PHONE_HREF = "tel:+549XXXXXXXXXX"; // TODO: teléfono real

/** Link a WhatsApp, opcionalmente con mensaje prellenado. */
export function waLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
