import { useTranslations } from "next-intl";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Link } from "@/lib/i18n/navigation";
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
import { waLink } from "@/lib/contact";

/**
 * Reservá — la cabaña de noche con las guirnaldas, a todo el ancho, y el
 * llamado encima (propuesta "A · Noche en la galería", elegida 2026-11-04).
 * Antes era un bloque centrado sobre marfil con mucho aire vacío.
 *
 * FOTO: secciones/seccion reservas (1).jpg, panorámica (1584×672) subida para
 * esta sección. En escritorio la caja es casi del mismo ratio y el recorte es
 * mínimo; en celular la caja es vertical y el 70% horizontal se queda con la
 * cabaña de la derecha, la de las guirnaldas (al centro cae el tronco oscuro).
 *
 * "Reservar ahora" respeta el modo de reserva: con WhatsApp va a /tarifas
 * (precios y contacto), con reservas online va a /reservas.
 */
const BOTON =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[4px] px-[30px] text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition-[background,transform,color,border-color] duration-300 hover:-translate-y-0.5";

export function CtaReserva({ bookingMode }: { bookingMode?: BookingMode } = {}) {
  const t = useTranslations("cta");
  const whatsappMode = isWhatsAppBookingMode(bookingMode ?? "whatsapp");

  return (
    <section
      id="reservar"
      className="relative isolate flex min-h-[clamp(660px,50vw,720px)] items-end overflow-hidden bg-carbon text-marfil md:items-center"
    >
      <div className="absolute inset-0 -z-10">
        <ImageSlot
          label={t("photoAlt")}
          photo="secciones/seccion reservas (1).jpg"
          className="h-full w-full bg-transparent!"
          position="70% 50%"
          sizes="100vw"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,18,15,.1)_0%,rgba(20,18,15,.55)_36%,rgba(20,18,15,.9)_68%)] md:bg-[linear-gradient(90deg,rgba(20,18,15,.86)_0%,rgba(20,18,15,.6)_42%,rgba(20,18,15,.05)_78%)]"
      />

      <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-48 md:px-12 md:py-24">
        <div className="max-w-[540px]">
          <p className="m-0 flex items-center gap-3.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-arena">
            <span aria-hidden="true" className="block h-px w-8 bg-arena" />
            {t("kicker")}
          </p>

          <h2
            className="font-display m-0 mt-[20px] text-balance font-normal leading-[1.04] tracking-[-0.024em] text-marfil"
            style={{ fontSize: "clamp(36px,4.6vw,60px)" }}
          >
            {t.rich("title", { em: (chunks) => <em className="font-light">{chunks}</em> })}
          </h2>

          <p className="m-0 mt-5 max-w-[440px] text-pretty text-[16px] font-light leading-[1.72] text-[rgba(245,238,225,.88)]">
            {t("body")}
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            <Link
              href={whatsappMode ? "/tarifas" : "/reservas"}
              className={`${BOTON} bg-terracota text-marfil hover:bg-terracota-hover`}
            >
              {t("bookNow")}
            </Link>

            <a
              href={waLink()}
              target="_blank"
              rel="noopener"
              className={`${BOTON} border border-[#25D366] bg-[#25D366] text-[#073b1d] hover:border-[#20bd5b] hover:bg-[#20bd5b]`}
            >
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.042zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              {t("whatsapp")}
            </a>
          </div>

          <p className="font-accent m-0 mt-6 origin-left text-center text-[28px] text-atardecer sm:-rotate-3 sm:text-left md:text-[30px]">
            {t("handwritten")}
          </p>
        </div>
      </div>
    </section>
  );
}
