import { UNITS, type Unit } from "@/lib/units";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { CHECK_IN, CHECK_OUT, PETS_ALLOWED } from "@/lib/site";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, GOOGLE_MAPS_URL, SAME_AS } from "@/lib/contact";

// Datos estructurados (schema.org). Es lo que Google y los motores de IA leen
// para responder "dónde queda", "cuánto sale", "para cuántos", "tiene pileta":
// todo dato de acá tiene que coincidir con lo que dice la página.
//
// Las piezas se enlazan por @id: el negocio (LodgingBusiness) contiene las
// cabañas (Accommodation) y apunta a su ficha de Google Maps con sameAs, que es
// la señal que une esta web con la ficha que ya conocen los buscadores.

type Locale = "es" | "en" | "pt";
const loc = (l: string): Locale => (l === "en" || l === "pt" ? l : "es");

export const LODGING_ID = `${SITE_URL}/#lodging`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const accommodationId = (slug: string) => `${SITE_URL}/#cabana-${slug}`;

const AMENITIES: Record<Locale, string[]> = {
  es: ["Pileta privada", "Muelle sobre el lago", "Kayaks", "Parrilla", "Wi-Fi", "Aire acondicionado", "Cocina equipada", "Ropa de cama y toallas", "Estacionamiento"],
  en: ["Private pool", "Lake dock", "Kayaks", "Barbecue grill", "Wi-Fi", "Air conditioning", "Fully equipped kitchen", "Bed linen and towels", "Parking"],
  pt: ["Piscina privativa", "Píer no lago", "Caiaques", "Churrasqueira", "Wi-Fi", "Ar-condicionado", "Cozinha equipada", "Roupa de cama e banho", "Estacionamento"],
};

const GUESTS: Record<Locale, string> = { es: "huéspedes", en: "guests", pt: "hóspedes" };
const NIGHT: Record<Locale, string> = { es: "noche", en: "night", pt: "noite" };
const PAYMENT: Record<Locale, string> = {
  es: "Tarjeta de crédito, tarjeta de débito, transferencia bancaria",
  en: "Credit card, debit card, bank transfer",
  pt: "Cartão de crédito, cartão de débito, transferência bancária",
};

const amenityFeature = (l: Locale) =>
  AMENITIES[l].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true }));

const ADDRESS = {
  "@type": "PostalAddress",
  // El paraje va en streetAddress: schema.org no tiene campo de barrio, y
  // addressLocality tiene que seguir siendo la localidad —Puerto Libertad— que
  // es la que figura en las fichas de Google, Airbnb y Facebook del lodge.
  streetAddress: "Puerto Bossetti, costa del lago Urugua-í, Ex Ruta Nacional 12",
  addressLocality: "Puerto Libertad",
  addressRegion: "Misiones",
  addressCountry: "AR",
};

// Coordenadas reales, tomadas de la ficha de Google Maps del lodge.
const GEO = { "@type": "GeoCoordinates", latitude: -25.842811, longitude: -54.538968 };

/**
 * El sitio y el negocio, para la home: WebSite + LodgingBusiness en un @graph.
 * `images` son URLs absolutas de fotos reales; `fromPrice`, el precio de lista
 * más bajo por noche (el que ve el huésped).
 */
export function lodgingJsonLd({
  locale,
  description,
  images,
  fromPrice,
}: {
  locale: string;
  description: string;
  images: string[];
  fromPrice: number;
}) {
  const l = loc(locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: absoluteUrl(`/${l}`),
        name: "La Casa del Lago Urugua-í",
        inLanguage: l,
        publisher: { "@id": LODGING_ID },
      },
      {
        "@type": "LodgingBusiness",
        "@id": LODGING_ID,
        name: "La Casa del Lago Urugua-í",
        alternateName: "Casa del Lago Urugua-í",
        description,
        url: absoluteUrl(`/${l}`),
        image: images,
        logo: absoluteUrl("/logo-lago.png"),
        address: ADDRESS,
        geo: GEO,
        hasMap: GOOGLE_MAPS_URL,
        sameAs: SAME_AS,
        telephone: CONTACT_PHONE_DISPLAY,
        email: CONTACT_EMAIL,
        checkinTime: CHECK_IN,
        checkoutTime: CHECK_OUT,
        petsAllowed: PETS_ALLOWED,
        numberOfRooms: UNITS.length,
        currenciesAccepted: "ARS",
        paymentAccepted: PAYMENT[l],
        priceRange: `ARS ${new Intl.NumberFormat("es-AR").format(fromPrice)}+ / ${NIGHT[l]}`,
        amenityFeature: amenityFeature(l),
        containsPlace: UNITS.map((u) => ({
          "@type": "Accommodation",
          "@id": accommodationId(u.slug),
          name: u.name,
          url: absoluteUrl(`/${l}/departamentos/${u.slug}`),
          occupancy: { "@type": "QuantitativeValue", maxValue: u.specs.guests, unitText: GUESTS[l] },
        })),
      },
    ],
  };
}

/** Las preguntas frecuentes que se ven en la home, como FAQPage. */
export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function accommodationJsonLd({
  unit,
  locale,
  nightlyPrice,
  description,
  images = [],
}: {
  unit: Unit;
  locale: string;
  nightlyPrice: number;
  description?: string;
  /** URLs absolutas de fotos de la cabaña. */
  images?: string[];
}) {
  const l = loc(locale);
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "@id": accommodationId(unit.slug),
    name: unit.name,
    ...(description ? { description } : {}),
    url: absoluteUrl(`/${l}/departamentos/${unit.slug}`),
    ...(images.length ? { image: images } : {}),
    numberOfRooms: unit.specs.bedrooms,
    numberOfBedrooms: unit.specs.bedrooms,
    numberOfBathroomsTotal: unit.specs.baths,
    floorSize: { "@type": "QuantitativeValue", value: unit.specs.area, unitCode: "MTK" },
    occupancy: { "@type": "QuantitativeValue", maxValue: unit.specs.guests, unitText: GUESTS[l] },
    petsAllowed: PETS_ALLOWED,
    amenityFeature: amenityFeature(l),
    offers: {
      "@type": "Offer",
      price: nightlyPrice,
      priceCurrency: "ARS",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: nightlyPrice,
        priceCurrency: "ARS",
        unitText: NIGHT[l],
      },
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/${l}/tarifas`),
    },
    containedInPlace: { "@id": LODGING_ID },
  };
}

export function breadcrumbJsonLd({ locale, unit }: { locale: string; unit: Unit }) {
  const ratesLabel = locale === "en" ? "Rates" : "Tarifas";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "La Casa del Lago Urugua-í", item: absoluteUrl(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: ratesLabel, item: absoluteUrl(`/${locale}/tarifas`) },
      {
        "@type": "ListItem",
        position: 3,
        name: unit.name,
        item: absoluteUrl(`/${locale}/departamentos/${unit.slug}`),
      },
    ],
  };
}
