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
import { Opiniones } from "@/components/home/Opiniones";
import { CtaReserva } from "@/components/home/CtaReserva";
import { Contacto } from "@/components/home/Contacto";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { getBookingMode } from "@/lib/site-settings.server";
import { getPublishedTestimonios, getReviewsAggregate } from "@/lib/reviews/testimonios.server";
import { bucketSrc, UNIT_COVER_PHOTOS } from "@/components/ui/ImageSlot";
import { PreguntasFrecuentes } from "@/components/home/PreguntasFrecuentes";
import { lodgingJsonLd, faqJsonLd } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/metadata";

// Fotos reales para el JSON-LD del negocio: la panorámica y una de cada cabaña.
const LODGING_IMAGES = ["hero/hero2.jpg", ...Object.values(UNIT_COVER_PHOTOS)].map((p) => bucketSrc(p));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  // El título ya trae la marca ("… | La Casa del Lago"): sin plantilla.
  return pageMetadata({
    locale,
    path: "",
    title: t("homeTitle"),
    description: t("homeDescription"),
    imageAlt: t("ogAlt"),
    absoluteTitle: true,
  });
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
  const [rateSettings, bookingMode, testimonios, agregado] = await Promise.all([
    getRateSettings(),
    getBookingMode(),
    getPublishedTestimonios(),
    getReviewsAggregate(),
  ]);
  const listPrices = methodRates(rateSettings, "card").nightly;
  const seo = await getTranslations({ locale, namespace: "seo" });
  const faq = await getTranslations({ locale, namespace: "faq" });
  const lodgingLd = lodgingJsonLd({
    locale,
    description: seo("homeDescription"),
    images: LODGING_IMAGES,
    fromPrice: Math.min(...Object.values(listPrices)),
  });
  const faqLd = faqJsonLd(faq.raw("items") as Array<{ q: string; a: string }>);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <SiteNav />
      <main className="relative">
        {/* El buscador vive dentro de la columna de texto del hero, debajo del
            subtítulo — ya no dockeado por fuera al borde inferior. */}
        <Hero>
          <SearchWidget variant="hero" stay={{ high: rateSettings.high, low: rateSettings.low }} />
        </Hero>
        <Manifiesto />
        <UnitsGrid prices={listPrices} />
        <Experiencias />
        <ComoLlegar />
        <RelatoImagenes />
        {/* Antes del CTA a propósito: la prueba social es lo último que se lee
            antes de "Reservar ahora". */}
        <Opiniones testimonios={testimonios} agregado={agregado} />
        <CtaReserva bookingMode={bookingMode} />
        <PreguntasFrecuentes />
        <Contacto />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
