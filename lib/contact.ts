// Datos de contacto reales del alojamiento — único lugar donde viven.
// Datos públicos de contacto de La Casa del Lago Urugua-í.

export const WHATSAPP_NUMBER = "5493757446156";
export const CONTACT_PHONE_DISPLAY = "+54 9 3757 446156";
export const CONTACT_EMAIL = "lacasadellagouruguai2026@gmail.com";
export const CONTACT_PHONE_HREF = "tel:+5493757446156";

// Redes: mientras sean null el ícono no se muestra (antes apuntaban a
// "#contacto" y en el celular se tocaban sin que pasara nada).
// TODO: cargar las URLs reales de Instagram y Facebook.
export const INSTAGRAM_URL: string | null = null;
export const FACEBOOK_URL: string | null = null;

// Ficha de Google Maps del lodge ("LA CASA DEL LAGO URUGUA-I"): el CID sale
// del mapa embebido en Contacto. Va en el sameAs del JSON-LD, que es lo que
// le dice a Google y a las IAs que esta web y esa ficha son el mismo negocio.
export const GOOGLE_MAPS_URL = "https://www.google.com/maps?cid=13059304702414548858";

/** Perfiles oficiales del negocio en otros sitios (schema.org sameAs). */
export const SAME_AS: string[] = [GOOGLE_MAPS_URL, INSTAGRAM_URL, FACEBOOK_URL].filter(
  (u): u is string => u !== null,
);

/** Link a WhatsApp, opcionalmente con mensaje prellenado. */
export function waLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
