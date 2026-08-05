import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SearchWidget } from "@/components/home/SearchWidget";
import { UnitRateCard } from "@/components/tarifas/UnitRateCard";
import { InfoSections } from "@/components/tarifas/InfoSections";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { UNITS } from "@/lib/units";
import { parseRateQuery } from "@/lib/reservation/search";
import { getRatesForRange } from "@/lib/reservation/rates.server";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { methodRates } from "@/lib/reservation/method-pricing";

import { getBookingMode } from "@/lib/site-settings.server";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: "Tarifas — La Casa del Lago Urugua-í",
    description: t("description"),
    alternates: { languages: { es: "/es/tarifas", en: "/en/tarifas", pt: "/pt/tarifas" } },
  };
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TarifasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "tarifas" });

  const query = parseRateQuery({ checkIn: str(sp.checkIn), checkOut: str(sp.checkOut), guests: str(sp.guests) });
  // Memoizado (TTL 30s): la segunda llamada dentro de getRatesForRange no pega en la DB.
  const [settings, bookingMode] = await Promise.all([
    getRateSettings(),
    getBookingMode(),
  ]);
  // Precio de lista público = método tarjeta (comisión incluida, ver method-pricing.ts)
  const listPrices = methodRates(settings, "card").nightly;
  const rates = query ? await getRatesForRange(query.checkIn, query.checkOut, query.guests) : null;

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-marfil pb-24">
        <section className="relative min-h-[430px] overflow-visible bg-[#173d43] pt-[142px] md:min-h-[470px]">
          <div className="absolute inset-0 opacity-100">
            <ImageSlot
              label="Lago Urugua-í"
              photo="hero/ChatGPT1.jpg"
              className="h-full w-full"
              priority
              position="50% 58%"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,39,40,.72)_0%,rgba(17,39,40,.42)_38%,rgba(17,39,40,.08)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(17,39,40,.24),transparent_58%)]" />

          <div className="relative z-10 mx-auto max-w-[1180px] px-5 pb-32 md:px-10 md:pb-36">
            <div className="max-w-[650px]">
              <div className="mb-5 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[.28em] text-[#b7d5d1]">
                <span className="h-px w-9 bg-[#b7d5d1]/70" />
                {t("brandLine")}
              </div>
              <h1 className="m-0 max-w-[620px] font-display text-[clamp(38px,6vw,70px)] font-normal leading-[.98] tracking-[-.025em] text-marfil">
                {query ? t("title") : t("pickDatesTitle")}
              </h1>
              <p className="mt-5 max-w-[540px] text-[15px] leading-[1.7] text-marfil/75 md:text-[16px]">
                {query ? t("subtitle") : t("pickDatesHint")}
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-[-52px] z-20">
            <SearchWidget variant="bar" initial={query ?? undefined} />
          </div>
        </section>

        <div className="mx-auto max-w-[1180px] px-5 pt-[112px] md:px-10 md:pt-[120px]">
          <div className="mb-7 flex flex-col justify-between gap-3 border-b border-borde-medio pb-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-[.25em] text-lago">{t("sectionKicker")}</div>
              <h2 className="m-0 font-display text-[clamp(28px,4vw,42px)] font-normal leading-none text-carbon">
                {query ? t("subtitle") : t("title")}
              </h2>
            </div>
            <div className="text-[12px] uppercase tracking-[.14em] text-muted">{t("accommodationsCount", { count: UNITS.length })}</div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {UNITS.map((unit) => {
              const rate = rates ? rates.find((r) => r.unit.slug === unit.slug)! : null;
              return <UnitRateCard key={unit.slug} unit={unit} rate={rate} query={query} prices={listPrices} bookingMode={bookingMode} />;
            })}
          </div>

          <InfoSections />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
