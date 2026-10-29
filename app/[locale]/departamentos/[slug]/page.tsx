import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { UnitDetail } from "@/components/departamento/UnitDetail";
import { unitGalleryPhotos } from "@/lib/unit-photos";
import { MobileBookingBar } from "@/components/departamento/StickyBookingCard";
import { UNITS, getUnit } from "@/lib/units";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { getBookingMode } from "@/lib/site-settings.server";
import { methodRates } from "@/lib/reservation/method-pricing";
import { routing } from "@/lib/i18n/routing";
import { accommodationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/metadata";
import { UNIT_COVER_PHOTOS, bucketSrc } from "@/components/ui/ImageSlot";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    UNITS.map((unit) => ({ locale, slug: unit.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const unit = getUnit(slug);
  if (!unit) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  // Título y descripción propios de cada cabaña (antes repetían los de la home)
  // y su foto de portada como imagen para compartir.
  return pageMetadata({
    locale,
    path: `/departamentos/${unit.slug}`,
    title: t(`units.${unit.slug}.title`),
    description: t(`units.${unit.slug}.description`),
    imageAlt: unit.name,
    image: { path: UNIT_COVER_PHOTOS[unit.slug] },
  });
}

export default async function DepartamentoPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const unit = getUnit(slug);
  if (!unit) notFound();

  const [settings, bookingMode] = await Promise.all([
    getRateSettings(),
    getBookingMode(),
  ]);
  // "Desde $" público = precio de lista (método tarjeta, ver method-pricing.ts)
  const listPrices = methodRates(settings, "card").nightly;
  const seo = await getTranslations({ locale, namespace: "seo" });
  // Las primeras fotos de la galería: suficientes para el resultado enriquecido.
  const images = unitGalleryPhotos(unit.slug).slice(0, 6).map((p) => bucketSrc(p.photo));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            accommodationJsonLd({
              unit,
              locale,
              nightlyPrice: listPrices[unit.slug],
              description: seo(`units.${unit.slug}.description`),
              images,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd({ locale, unit })) }}
      />
      <SiteNav />
      <main>
        <UnitDetail unit={unit} locale={locale} prices={listPrices} bookingMode={bookingMode} />
      </main>
      <SiteFooter />
      <MobileBookingBar unit={unit} price={listPrices[unit.slug]} bookingMode={bookingMode} />
      <WhatsAppFab raised />
    </>
  );
}
