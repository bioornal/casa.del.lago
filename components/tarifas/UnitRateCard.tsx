import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { buildCheckoutUrl, type RateQuery } from "@/lib/reservation/search";
import type { UnitRate } from "@/lib/reservation/rates.server";
import type { Unit, UnitSlug } from "@/lib/units";
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
import { waLink } from "@/lib/contact";

function fmtDay(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

const ctaActiveClass =
  "inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-[2px] bg-terracota px-[22px] py-[13px] text-[11.5px] font-medium uppercase tracking-[.1em] text-marfil no-underline transition-[background,transform,box-shadow] duration-300 hover:-translate-y-px hover:bg-terracota-hover hover:shadow-[0_12px_24px_-14px_rgba(162,75,42,.8)]";

const ctaDisabledClass =
  "inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-[2px] border border-borde-medio bg-arena-clara px-[22px] py-[13px] text-[11.5px] font-medium uppercase tracking-[.1em] text-muted";

const chipClass =
  "inline-flex items-center border-b border-[#c8dfe1] pb-1 text-[11px] tracking-[.03em] text-lago";

interface UnitRateCardProps {
  unit: Unit;
  rate: UnitRate | null; // null = sin fechas elegidas (modo "desde")
  query: RateQuery | null;
  prices: Record<UnitSlug, number>; // tarifa de lista por noche (DB, vía getRateSettings)
  bookingMode?: BookingMode;
}

export function UnitRateCard({ unit, rate, query, prices, bookingMode }: UnitRateCardProps) {
  const t = useTranslations("tarifas");
  const locale = useLocale();
  const whatsappMode = isWhatsAppBookingMode(bookingMode);
  const overCapacity = !!query && query.guests > unit.specs.guests;
  const bookable = !!rate && rate.available && !overCapacity;
  const nightly = rate ? rate.nightly : prices[unit.slug];
  const chips = t("specs", {
    guests: unit.specs.guests,
    bedrooms: unit.specs.bedrooms,
    baths: unit.specs.baths,
    area: unit.specs.area,
  }).split(" · ");

  return (
    <article className="group overflow-hidden rounded-[8px] border border-borde-medio bg-white transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(.16,.84,.44,1)] hover:-translate-y-1 hover:shadow-card">
      <div className="relative h-[270px] overflow-hidden bg-slot sm:h-[310px]">
        <ImageSlot label={unit.name} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.035]" />
        <div className="absolute inset-0 bg-gradient-to-t from-carbon/55 via-transparent to-transparent" />
        <div className="absolute bottom-5 left-6 text-[10px] font-medium uppercase tracking-[.26em] text-marfil/80">
          {t("unitLabel")}
        </div>
      </div>

      <div className="flex min-h-[270px] flex-col p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <h3 className="m-0 font-display text-[30px] font-medium leading-none text-carbon transition-colors duration-300 group-hover:text-lago">
            {unit.name}
          </h3>
          <span className="mt-1 shrink-0 text-[10px] uppercase tracking-[.18em] text-bronce">{unit.slug === "aratiri" ? "01" : "02"}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {chips.map((chip) => (
            <span key={chip} className={chipClass}>
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-borde-claro pt-5">
          <div>
            {rate && rate.available && rate.nights > 0 ? (
              <>
                <div className="font-display text-[32px] leading-none text-carbon">{money(rate.total)}</div>
                <div className="mt-2 text-[11.5px] text-muted">
                  {rate.nights} {rate.nights === 1 ? t("night") : t("nights")} · {money(nightly)} {t("perNight")}
                </div>
                {!whatsappMode && rate.savings > 0 && (
                  <div className="mt-2 text-[11.5px] font-medium text-[#2f6b46]">
                    {t("transferNote", { total: money(rate.transferTotal), savings: money(rate.savings) })}
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-[.18em] text-muted">{t("from")}</div>
                <div className="font-display text-[28px] leading-none text-carbon">
                  {money(prices[unit.slug])} <span className="font-sans text-[12px] text-muted">{t("perNight")}</span>
                </div>
              </div>
            )}
          </div>

          {bookable && query ? (
            whatsappMode ? (
              <a
                href={waLink(
                  t("waMessage", {
                    unit: unit.name,
                    checkIn: fmtDay(query.checkIn, locale),
                    checkOut: fmtDay(query.checkOut, locale),
                    guests: query.guests,
                  }),
                )}
                target="_blank"
                rel="noopener"
                className={ctaActiveClass}
              >
                {t("reserveWhatsApp")}
              </a>
            ) : (
              <Link href={buildCheckoutUrl({ unitId: unit.slug, ...query })} className={ctaActiveClass}>
                {t("reserve")}
              </Link>
            )
          ) : (
            <span className={ctaDisabledClass}>
              {!query ? t("pickDatesCta") : overCapacity ? t("capacity", { n: unit.specs.guests }) : t("unavailable")}
            </span>
          )}
        </div>

        {whatsappMode && bookable && (
          <p className="m-0 mt-3 text-right text-[11.5px] text-muted">{t("waNote")}</p>
        )}
      </div>
    </article>
  );
}
