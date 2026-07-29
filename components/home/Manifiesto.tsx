import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";

export function Manifiesto() {
  const t = useTranslations("manifiesto");

  return (
    <section
      id="casa"
      className="relative bg-marfil px-0 py-[clamp(80px,11vh,140px)]"
    >

      <div className="relative z-[1] mx-auto max-w-[1240px] px-5 md:px-12">
        <div>
          <Kicker>{t("kicker")}</Kicker>
        </div>

        {/* items-start y no items-end: en el diseño el cuerpo arranca arriba, a
            la altura del título. El clamp del h2 es el del diseño — con el
            anterior (hasta 60px) el título se partía en tres líneas. */}
        <div className="grid grid-cols-1 items-start gap-[clamp(32px,6vw,96px)] mt-6 md:mt-8 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            <h2
              className="font-display m-0 text-balance font-normal leading-[1.1] tracking-[-0.018em] text-carbon"
              style={{ fontSize: "clamp(28px,3.6vw,50px)" }}
            >
              {t("title")}
            </h2>
          </div>

          <div className="pt-[clamp(0px,1.2vw,14px)]">
            <p className="m-0 text-[16px] font-light leading-[1.75] text-cuerpo">
              {t("body")}
            </p>
            <a
              href="#lugar"
              className="mt-[28px] inline-flex items-center gap-[9px] border-b border-[#b8d2da] pb-[5px] text-[13px] uppercase tracking-[.08em] text-lago no-underline transition-[gap,border-color] duration-300 hover:gap-[16px] hover:border-lago"
            >
              {t("link")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
