import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { methodRates } from "@/lib/reservation/method-pricing";
import { UNITS } from "@/lib/units";
import { absoluteUrl } from "@/lib/seo";
import { CHECK_IN, CHECK_OUT } from "@/lib/site";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, GOOGLE_MAPS_URL, waLink } from "@/lib/contact";

// llms.txt: resumen en texto plano para motores de IA (ChatGPT, Claude,
// Perplexity…), que lo leen para entender y citar el sitio. Antes era un archivo
// fijo en /public con el precio NETO de hace meses ($99.800) en vez del de lista
// que ve el huésped, y sin la pileta ni el muelle. Ahora sale de los mismos
// datos que la web; se regenera al guardar tarifas (ver admin/tarifas/actions).
export const dynamic = "force-static";

const ars = (n: number) => `$${new Intl.NumberFormat("es-AR").format(n)}`;

export async function GET() {
  const settings = await getRateSettings();
  const list = methodRates(settings, "card");
  const from = Math.min(...UNITS.map((u) => list.nightly[u.slug]));
  const url = (p: string) => absoluteUrl(p);

  const body = `# La Casa del Lago Urugua-í

> Dos cabañas con pileta propia, muelle y kayaks a orillas del lago Urugua-í, en Puerto Libertad (Misiones, Argentina), a 27 km de las Cataratas del Iguazú. Se reserva directo con los anfitriones, sin intermediarios.

Sitio oficial: ${url("/es")} (también en inglés: ${url("/en")} y portugués: ${url("/pt")}).
Ficha de Google Maps: ${GOOGLE_MAPS_URL}

## Cabañas

${UNITS.map(
  (u) =>
    `- [${u.name}](${url(`/es/departamentos/${u.slug}`)}): hasta ${u.specs.guests} huéspedes, ${u.specs.bedrooms} ${
      u.specs.bedrooms === 1 ? "dormitorio" : "dormitorios"
    }, ${u.specs.baths} baño, ${u.specs.area} m². Desde ${ars(list.nightly[u.slug])} por noche para ${settings.baseGuests} huéspedes.`,
).join("\n")}

Cada cabaña tiene su propia pileta y su parrilla, y las dos tienen acceso al muelle sobre el lago, con kayaks.
Precios en pesos argentinos (ARS), desde ${ars(from)} por noche en temporada baja. En temporada alta el precio por noche es mayor.
Se suma una tarifa de limpieza única por estadía (${ars(list.cleaningFee)}) y un cargo por huésped adicional.
Tarifas y disponibilidad para fechas concretas: ${url("/es/tarifas")}

## Ubicación

Puerto Bossetti, Puerto Libertad, Misiones, Argentina, a orillas del lago Urugua-í, sobre la Ex Ruta Nacional 12 entre Puerto Iguazú y Puerto Libertad. Acceso por asfalto, estacionamiento en la puerta.

Distancias por ruta:
- Cataratas del Iguazú (acceso al Parque Nacional, lado argentino): 27 km, unos 36 minutos
- Aeropuerto Internacional de Iguazú (IGR): 30 km, unos 40 minutos
- Minas de Wanda: 21 km
- Puerto Libertad (centro): 15 km
- Foz do Iguaçu, Brasil (centro): 45 km, más el paso de aduana
- Ciudad del Este, Paraguay: 50 km, más dos pasos de aduana
- Posadas: 269 km

## Servicios

Pileta privada, muelle sobre el lago, kayaks, parrilla, wifi, aire acondicionado, cocina equipada, ropa de cama y toallas, estacionamiento.
No se admiten mascotas. Check-in desde las ${CHECK_IN} h · check-out hasta las ${CHECK_OUT} h.

## Reservas y políticas

- Reserva directa desde ${url("/es/tarifas")} o por WhatsApp: ${waLink()}
- Pago con tarjeta o transferencia bancaria.
- Cancelación con 7 días o más de anticipación: reembolso del 100%. Dentro de los 7 días previos al check-in: sin reembolso. Detalle: ${url("/es/politicas/cancelacion")}
- Contacto: ${CONTACT_PHONE_DISPLAY} · ${CONTACT_EMAIL}

## English summary

La Casa del Lago Urugua-í: two lakefront cabins (up to 6 and 7 guests), each with a private pool and grill, plus a dock and kayaks on Lake Urugua-í, Puerto Libertad, Misiones, Argentina. 27 km (about 36 minutes) from Iguazú Falls and 30 km from Iguazú airport (IGR). Book direct at ${url("/en/tarifas")}.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
