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
            className={`${BOTON} border border-borde-medio text-carbon hover:border-lago hover:text-lago`}
          >
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
