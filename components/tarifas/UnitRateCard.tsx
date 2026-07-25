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
  "inline-flex items-center justify-center whitespace-nowrap rounded-[3px] bg-terracota px-[26px] py-[13px] text-[12.5px] uppercase tracking-[.1em] text-marfil no-underline transition-[background,transform] duration-300 hover:bg-terracota-hover hover:-translate-y-px";

const ctaDisabledClass =
  "inline-flex items-center justify-center whitespace-nowrap rounded-[3px] border border-borde-medio px-[26px] py-[13px] text-[12.5px] uppercase tracking-[.1em] text-muted";

const chipClass =
  "inline-flex items-center rounded-full border border-[#CFE2E7] bg-[#EAF2F4] px-3 py-[5px] text-[11px] uppercase tracking-[.08em] text-lago";

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
    <div className="group grid grid-cols-1 overflow-hidden rounded-[6px] border border-borde-medio bg-white transition-[transform,box-shadow] duration-400 ease-[cubic-bezier(.16,.84,.44,1)] hover:-translate-y-1 hover:shadow-card md:grid-cols-[300px_1fr]">
      <div className="h-[210px] md:h-auto md:min-h-[220px]">
        <ImageSlot label={unit.name} className="h-full w-full" />
      </div>

      <div className="flex flex-col p-5 md:py-6 md:pl-0 md:pr-7">
        <h3 className="font-display m-0 font-medium text-[27px] text-carbon transition-colors duration-300 group-hover:text-lago">
          {unit.name}
        </h3>

        <div className="mt-[10px] flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className={chipClass}>
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-[18px]">
          <div>
            {rate && rate.available && rate.nights > 0 ? (
              <>
                <div className="font-display text-[30px] text-carbon">{money(rate.total)}</div>
                <div className="mt-[2px] text-[12px] text-muted">
                  {rate.nights} {rate.nights === 1 ? t("night") : t("nights")} · {money(nightly)} {t("perNight")}
                </div>
                {!whatsappMode && rate.savings > 0 && (
                  <div className="mt-[6px] text-[12.5px] font-medium text-[#2f6b46]">
                    {t("transferNote", { total: money(rate.transferTotal), savings: money(rate.savings) })}
                  </div>
                )}
              </>
            ) : (
              <div className="font-display text-[24px] text-muted">
                {t("from")} {money(prices[unit.slug])} <span className="text-[14px]">{t("perNight")}</span>
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
          <p className="m-0 mt-[10px] text-right text-[12.5px] text-muted">{t("waNote")}</p>
        )}
      </div>
    </div>
  );
}
