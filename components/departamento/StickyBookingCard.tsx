import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { Unit } from "@/lib/units";
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
import { waLink } from "@/lib/contact";

export function StickyBookingCard({ unit, price, bookingMode }: { unit: Unit; price: number; bookingMode?: BookingMode }) {
  const t = useTranslations("departamento");
  const tb = useTranslations("bookingBar");
  const whatsappMode = isWhatsAppBookingMode(bookingMode ?? "whatsapp");
  const ctaClass =
    "mt-[18px] block text-center bg-terracota text-marfil text-[12.5px] uppercase tracking-[.1em] px-4 py-4 rounded-[6px] no-underline transition-[background,transform] duration-300 hover:bg-terracota-hover hover:-translate-y-0.5";

  return (
    <div className="lg:sticky lg:top-[108px]">
      <div
        className="bg-marfil rounded-[6px] border border-borde-claro p-7"
        style={{ boxShadow: "0 40px 80px -52px rgba(29,29,29,.5)" }}
      >
        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[30px] text-carbon">
            ${new Intl.NumberFormat("es-AR").format(price)}
          </span>
          <span className="text-[13px] text-muted">{t("perNight")}</span>
        </div>

        {/* Dates + guests mini-grid. Parece un formulario, así que lleva al
            buscador real: como celdas muertas, en el celular se tocaban y no
            pasaba nada. */}
        <Link
          href="/tarifas"
          className="mt-5 block rounded-[4px] border border-borde-claro overflow-hidden text-inherit no-underline"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#E2DACE" }}
        >
          {/* Llegada */}
          <div className="bg-marfil px-[15px] py-[13px]">
            <div className="text-[11px] uppercase tracking-[.18em] text-lago">
              {tb("arrival")}
            </div>
            <div className="font-display mt-1 text-[15px] text-carbon">{tb("select")}</div>
          </div>
          {/* Salida */}
          <div className="bg-marfil px-[15px] py-[13px]">
            <div className="text-[11px] uppercase tracking-[.18em] text-lago">
              {tb("departure")}
            </div>
            <div className="font-display mt-1 text-[15px] text-carbon">{tb("select")}</div>
          </div>
          {/* Huéspedes — full width */}
          <div className="bg-marfil px-[15px] py-[13px] border-t border-borde-claro" style={{ gridColumn: "span 2" }}>
            <div className="text-[11px] uppercase tracking-[.18em] text-lago">
              {tb("guests")}
            </div>
            <div className="font-display mt-1 text-[15px] text-carbon">{t("upToGuests", { n: unit.specs.guests })}</div>
          </div>
        </Link>

        {/* Book CTA */}
        {whatsappMode ? (
          <a href={waLink(t("waBookMessage", { unit: unit.name }))} target="_blank" rel="noopener" className={ctaClass}>
            {t("bookCtaWhatsApp")}
          </a>
        ) : (
          <Link href={`/reservas?unit=${unit.slug}`} className={ctaClass}>
            {t("bookCta")}
          </Link>
        )}

        {/* Note */}
        <div className="mt-[14px] text-center text-[12px] text-muted">
          {whatsappMode ? t("waBookNote") : t("bookNote")}
        </div>

        {/* WhatsApp link */}
        <div className="mt-[18px] pt-[18px] border-t border-[#E7E0D4] flex items-center justify-center gap-[10px]">
          <a
            href={waLink(t("waBookMessage", { unit: unit.name }))}
            target="_blank"
            rel="noopener"
            className="text-[13px] text-selva font-semibold no-underline border-b border-[#b9c6bc] pb-[2px] transition-colors duration-[250ms] hover:text-whatsapp"
          >
            {t("whatsappLink")} →
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Barra de reserva fija al pie, sólo debajo de lg. En el celular la tarjeta de
 * arriba queda después de 20+ fotos de galería: sin esta barra el precio y el
 * botón de reservar aparecían recién a varios metros de scroll.
 * Incluye un espaciador para que el final del footer no quede tapado.
 */
export function MobileBookingBar({ unit, price, bookingMode }: { unit: Unit; price: number; bookingMode?: BookingMode }) {
  const t = useTranslations("departamento");
  const whatsappMode = isWhatsAppBookingMode(bookingMode ?? "whatsapp");
  const ctaClass =
    "inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full bg-terracota px-5 text-[12.5px] font-bold uppercase tracking-[.1em] text-marfil no-underline";

  return (
    <>
      <div aria-hidden className="h-[calc(76px+env(safe-area-inset-bottom))] bg-lago-hover lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-[54] border-t border-borde-claro bg-marfil/95 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-20px_rgba(29,29,29,.45)] backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-[12.5px] text-muted">{unit.name}</div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="font-display text-[22px] leading-tight text-carbon">
                ${new Intl.NumberFormat("es-AR").format(price)}
              </span>
              <span className="text-[13px] text-muted">{t("perNight")}</span>
            </div>
          </div>
          {whatsappMode ? (
            // Texto corto + ícono: "Reservar por WhatsApp" no entra al lado del
            // precio en 360px; el nombre completo queda como aria-label.
            <a
              href={waLink(t("waBookMessage", { unit: unit.name }))}
              target="_blank"
              rel="noopener"
              aria-label={t("bookCtaWhatsApp")}
              className={`${ctaClass} gap-2`}
            >
              <svg aria-hidden className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.042z" />
              </svg>
              {t("bookCta")}
            </a>
          ) : (
            <Link href={`/reservas?unit=${unit.slug}`} className={ctaClass}>
              {t("bookCta")}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
