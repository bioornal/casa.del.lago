import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { Reveal } from "@/components/motion/Reveal";
import { RevealTitle } from "@/components/motion/RevealTitle";

const ROWS = ["igr", "cataratas", "wanda", "posadas"] as const;

export function ComoLlegar() {
  const t = useTranslations("comoLlegar");

  return (
    <section
      id="llegar"
      className="bg-marfil px-[clamp(20px,4vw,56px)] py-[clamp(80px,11vh,140px)]"
    >
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-[clamp(36px,6vw,96px)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <Reveal>
            <Kicker>{t("kicker")}</Kicker>
          </Reveal>
          <RevealTitle delay={0.08}>
            <h2
              className="font-display mt-[22px] text-balance font-normal leading-[1.14] tracking-[-0.02em] text-carbon"
              style={{ fontSize: "clamp(28px,3.2vw,44px)" }}
            >
              {t("title")}
            </h2>
          </RevealTitle>
          <Reveal delay={0.16}>
            <p className="mt-[22px] max-w-[420px] text-pretty text-[16px] font-light leading-[1.72] text-cuerpo">
              {t("body")}
            </p>
            <p className="mt-[22px] text-[14.5px] font-medium tracking-[.01em] text-carbon">
              {t("checkin")}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="grid">
            {ROWS.map((row, i) => (
              <div
                key={row}
                className={`flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-t border-borde-medio py-[18px] ${
                  i === ROWS.length - 1 ? "border-b" : ""
                }`}
              >
                <span className="font-display text-[19px] font-normal text-carbon">
                  {t(`rows.${row}.place`)}
                </span>
                <span className="whitespace-nowrap text-[14px] text-muted">
                  {t(`rows.${row}.distance`)}
                </span>
              </div>
            ))}
          </div>
          <a
            href="#contacto"
            className="mt-6 inline-flex items-center gap-[9px] border-b border-[#b8d2da] pb-[5px] text-[13px] uppercase tracking-[.08em] text-lago no-underline transition-[gap,border-color] duration-300 hover:gap-[16px] hover:border-lago"
          >
            {t("mapLink")}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
