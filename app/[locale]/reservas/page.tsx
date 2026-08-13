import { Suspense } from "react";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { ReservaFlow } from "@/components/reservas/ReservaFlow";
import { getBookingMode, isTestUnitEnabled } from "@/lib/site-settings.server";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { allowsTestUnit, shouldRedirectReservasToTarifas } from "@/lib/reservation/test-unit";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: `Reservas — La Casa del Lago Urugua-í`,
    description: t("description"),
    robots: { index: false, follow: false },
    alternates: {
      languages: {
        es: "/es/reservas",
        en: "/en/reservas",
        pt: "/pt/reservas",
      },
    },
  };
}

export default async function ReservasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  // Las DOS condiciones, no una: el flag global solo habilita la unidad de
  // prueba cuando además el deep-link la pide explícitamente por id (ver
  // lib/reservation/test-unit.ts). Nunca "flag prendido → dejar pasar".
  const testUnitOn = await isTestUnitEnabled();
  const allowTestUnit = allowsTestUnit(sp.unit, testUnitOn);

  // Reservas online pausadas: el checkout deriva a tarifas (reserva vía
  // WhatsApp) — salvo el deep-link de la unidad de prueba, que necesita poder
  // probar el cobro con el sitio todavía cerrado al público. La decisión
  // completa vive en shouldRedirectReservasToTarifas (con test directo): es
  // el único borde de seguridad del dominio que esta page saltea.
  if (shouldRedirectReservasToTarifas(sp.unit, testUnitOn, await getBookingMode())) {
    redirect(`/${locale}/tarifas`);
  }

  const settings = await getRateSettings();

  return (
    <main>
      <Suspense fallback={null}>
        <ReservaFlow settings={settings} allowTestUnit={allowTestUnit} />
      </Suspense>
    </main>
  );
}
