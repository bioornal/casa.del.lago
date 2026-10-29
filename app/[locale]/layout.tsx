import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/seo";
import { bucketSrc } from "@/components/ui/ImageSlot";
import { DEFAULT_OG_IMAGE, OG_LOCALE, SITE_NAME } from "@/lib/metadata";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import { display, sans, accent } from "@/lib/fonts";
import { FilmGrain } from "@/components/layout/FilmGrain";
import { FxWatchdog } from "@/components/motion/FxWatchdog";
import { fxDefaultAttr, FX_BOOT_SCRIPT } from "@/lib/fx";
import { LenisProvider } from "@/components/motion/LenisProvider";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Metadatos comunes a todo el sitio público. Lo central es metadataBase: sin él
// Next dejaba canonical, hreflang y og:url relativos ("/es"), y Google ignora un
// hreflang relativo. Las páginas sólo declaran título, descripción y
// pageAlternates(); la imagen para compartir sale de acá salvo que la pisen.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: { default: t("homeTitle"), template: "%s | La Casa del Lago" },
    description: t("homeDescription"),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale] ?? "es_AR",
      alternateLocale: Object.values(OG_LOCALE).filter((l) => l !== OG_LOCALE[locale]),
      images: [{ url: bucketSrc(DEFAULT_OG_IMAGE.path), width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height, alt: t("ogAlt") }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // suppressHydrationWarning: el script inline del body puede agregar la
  // clase sin-fx a <html> antes de hidratar (mismo patrón que next-themes)
  return (
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable} ${accent.variable}`}
      {...fxDefaultAttr()}
      suppressHydrationWarning
    >
      <body>
        {/* Kill-switch de efectos (ver lib/fx.ts): el server ya manda
            data-fx=FX_DEFAULT; este script aplica los overrides por URL
            (?sinfx=1 / ?fx=on / ?fx=lista) y el flag del FxWatchdog antes
            de hidratar. La URL siempre le gana al flag.

            Sólo tiene que correr en cargas reales. Lo único que re-renderizaba
            este layout en cliente era el cambio de idioma, y ahí React avisaba
            que no puede ejecutar scripts en cliente; se resolvió haciendo que
            ese cambio sea una navegación completa (ver LangSwitcher), no
            envolviéndolo en next/script — con beforeInteractive el aviso
            aparecía igual. */}
        <script dangerouslySetInnerHTML={{ __html: FX_BOOT_SCRIPT }} />
        <NextIntlClientProvider>
          <FilmGrain />
          <FxWatchdog />
          <LenisProvider>{children}</LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
