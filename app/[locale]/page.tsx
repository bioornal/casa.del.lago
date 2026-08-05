import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { Hero } from "@/components/home/Hero";
import { SearchWidget } from "@/components/home/SearchWidget";
import { Manifiesto } from "@/components/home/Manifiesto";
import { UnitsGrid } from "@/components/home/UnitsGrid";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { methodRates } from "@/lib/reservation/method-pricing";
import { Experiencias } from "@/components/home/Experiencias";
import { ComoLlegar } from "@/components/home/ComoLlegar";
import { RelatoImagenes } from "@/components/home/RelatoImagenes";
import { CtaReserva } from "@/components/home/CtaReserva";
import { Contacto } from "@/components/home/Contacto";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { getBookingMode } from "@/lib/site-settings.server";
import { bucketSrc } from "@/components/ui/ImageSlot";

const LODGING_JSONLD = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "La Casa del Lago Urugua-í",
  description:
    "Cabañas a orillas del lago Urugua-í, entre Puerto Iguazú y Puerto Libertad, Misiones. Reserva directa, confirmación automática.",
  address: {
    "@type": "PostalAddress",
    // El paraje va en streetAddress: schema.org no tiene campo de barrio, y
    // addressLocality tiene que seguir siendo la localidad —Puerto Libertad— que
    // es la que figura en las fichas de Google, Airbnb y Facebook del lodge.
    streetAddress: "Puerto Bossetti, costa del lago Urugua-í",
    addressLocality: "Puerto Libertad",
    addressRegion: "Misiones",
    addressCountry: "AR",
  },
  // Coordenadas reales, tomadas de la ficha de Google Maps del lodge.
  geo: { "@type": "GeoCoordinates", latitude: -25.842811, longitude: -54.538968 },
  telephone: "+54 9 XXX XXXXXX", // TODO: teléfono real
  email: "info@lacasadellago.com.ar", // TODO: email real
  priceRange: "$$",
  aggregateRating: undefined,
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Wi-Fi" },
    { "@type": "LocationFeatureSpecification", name: "Aire acondicionado" },
    { "@type": "LocationFeatureSpecification", name: "Cocina equipada" },
    { "@type": "LocationFeatureSpecification", name: "Estacionamiento" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: {
      languages: { es: "/es", en: "/en", pt: "/pt" },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: { es: "es_AR", en: "en_US", pt: "pt_BR" }[locale] ?? "es_AR",
      siteName: "La Casa del Lago Urugua-í",
      images: [
        {
          // La misma panorámica del hero, del bucket propio. Antes apuntaba a un
          // Cloudinary de otro cliente (ArumaLodge), que además servía otra foto.
          url: bucketSrc("hero/hero2.jpg"),
          width: 1678,
          height: 937,
          type: "image/jpeg",
          alt: "La Casa del Lago Urugua-í — Lago Urugua-í, Misiones",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Mismo precio de lista que /tarifas (tarjeta, con el costo del canal incluido):
  // si el home mostrara el neto, no coincidiría con lo que ve el huésped al reservar.
  const [rateSettings, bookingMode] = await Promise.all([
    getRateSettings(),
    getBookingMode(),
  ]);
  const listPrices = methodRates(rateSettings, "card").nightly;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LODGING_JSONLD) }}
      />
      <SiteNav />
      <main className="relative">
        {/* El buscador vive dentro de la columna de texto del hero, debajo del
            subtítulo — ya no dockeado por fuera al borde inferior. */}
        <Hero>
          <SearchWidget variant="hero" />
        </Hero>
        <Manifiesto />
        <UnitsGrid prices={listPrices} />
        <Experiencias />
        <ComoLlegar />
        <RelatoImagenes />
        <CtaReserva bookingMode={bookingMode} />
        <Contacto />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
