import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { Link } from "@/lib/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { FiguraAgua } from "@/components/motion/FiguraAgua";
import { RevealTitle } from "@/components/motion/RevealTitle";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { waLink } from "@/lib/contact";

export function CtaReserva() {
  const t = useTranslations("cta");
  const whatsappMode = isWhatsAppBookingMode();

  return (
    <section id="reservar" className="relative bg-marfil py-20 md:py-[150px]">
      {/* Las gotas viven acá y no en la galería: es la sección del agua ("tu
          lugar junto al agua"). El contenido va centrado en 880px, así que el
          margen izquierdo es aire de sobra en cualquier viewport ancho. */}
      <FiguraAgua kind="gotas" className="top-16 left-[7%]" size={92} />
      <div className="relative z-[1] mx-auto text-center max-w-[880px] px-5 md:px-12">
        <Reveal>
          <Kicker>{t("kicker")}</Kicker>
        </Reveal>

        <RevealTitle delay={0.08}>
          <h2
            className="font-display font-normal leading-[1.15] tracking-[-0.015em]"
            style={{
              fontSize: "clamp(34px,6vw,80px)",
              margin: "22px 0 0",
            }}
          >
            {t("title")}
          </h2>
        </RevealTitle>

        <Reveal delay={0.16}>
          <p
            className="font-light text-cuerpo mx-auto"
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              margin: "40px auto 42px",
              maxWidth: "48ch",
            }}
          >
            {t("body")}
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            {/* Locale-aware link styled as terracota button */}
            <Link
              href={whatsappMode ? "/tarifas" : "/reservas"}
              className="inline-flex items-center justify-center gap-2 text-[12.5px] uppercase tracking-[0.1em] px-9 py-4 rounded-[2px] transition-[background,transform,color,border-color] duration-300 bg-terracota text-marfil hover:bg-terracota-hover hover:-translate-y-0.5"
            >
              {t("bookNow")}
            </Link>

            <a
              href={waLink()}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 text-[12.5px] uppercase tracking-[0.1em] px-9 py-4 rounded-[2px] transition-[background,transform,color,border-color] duration-300 border border-[#c9bfae] text-carbon hover:border-carbon hover:bg-carbon hover:text-arena"
            >
              {t("whatsapp")}
            </a>
          </div>

          <p
            className="font-accent text-atardecer text-[27px] mt-8 inline-block"
            style={{ transform: "rotate(-2deg)" }}
          >
            {t("handwritten")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
