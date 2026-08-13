import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { Link } from "@/lib/i18n/navigation";
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
import { waLink } from "@/lib/contact";

// Columna angosta (660px) y centrada, como el diseño. Antes eran 880px con un
// h2 de hasta 80px: el título se comía el ancho y perdía el aire de alrededor.
const BOTON =
  "inline-flex items-center justify-center gap-2 rounded-[4px] px-[30px] py-4 text-[12px] font-bold uppercase tracking-[0.14em] transition-[background,transform,color,border-color] duration-300";

export function CtaReserva({ bookingMode }: { bookingMode?: BookingMode } = {}) {
  const t = useTranslations("cta");
  const whatsappMode = isWhatsAppBookingMode(bookingMode ?? "whatsapp");

  return (
    <section
      id="reservar"
      className="relative bg-marfil px-[clamp(20px,4vw,56px)] py-[clamp(88px,12vh,150px)] text-center"
    >
      <div className="relative z-[1] mx-auto max-w-[660px]">
        <Kicker>{t("kicker")}</Kicker>

        <h2
          className="font-display m-0 mt-[22px] text-balance font-normal leading-[1.08] tracking-[-0.024em] text-carbon"
          style={{ fontSize: "clamp(32px,4vw,56px)" }}
        >
          {t("title")}
        </h2>

        <p className="mx-auto mt-[22px] max-w-[480px] text-pretty text-[16px] font-light leading-[1.72] text-cuerpo">
          {t("body")}
        </p>

        <div className="mt-[34px] flex flex-wrap justify-center gap-3">
          <Link
            href={whatsappMode ? "/tarifas" : "/reservas"}
            className={`${BOTON} bg-terracota text-marfil hover:-translate-y-0.5 hover:bg-terracota-hover`}
          >
            {t("bookNow")}
          </Link>

          <a
            href={waLink()}
            target="_blank"
            rel="noopener"
            className={`${BOTON} border border-[#25D366] bg-[#25D366] text-[#073b1d] hover:-translate-y-0.5 hover:border-[#20bd5b] hover:bg-[#20bd5b]`}
          >
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.042zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            {t("whatsapp")}
          </a>
        </div>

        <p className="font-accent mt-[26px] text-[24px] text-atardecer">
          {t("handwritten")}
        </p>
      </div>
    </section>
  );
}
