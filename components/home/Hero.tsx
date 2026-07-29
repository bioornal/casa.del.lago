import { useTranslations } from "next-intl";
import { KenBurns } from "@/components/motion/KenBurns";
import { HeroReveal } from "@/components/motion/HeroReveal";

// Fotografía real del lago servida desde el bucket de assets del cliente.
const HERO_IMAGE =
  "https://nbtnfdntsvjwkxmkbsfh.supabase.co/storage/v1/object/public/client-assets/Juanma/hero_banner/hero2.jpg";

/**
 * El buscador entra como children y se renderiza dentro de la columna de texto:
 * ya no va dockeado por fuera al borde inferior del hero.
 */
export function Hero({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("hero");

  return (
    <header
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-[clamp(20px,4vw,56px)] pb-[clamp(48px,6vh,76px)]"
      style={{
        background:
          "linear-gradient(180deg,#3B2340 0%,#6B3552 26%,#B4552F 48%,#8A3A2C 60%,#2A1E22 78%,#161318 100%)",
      }}
    >
      {/* Media. El Ken Burns cierra en scale(1), así que no hace falta sangrado
          y se ve el 100% del encuadre en reposo. */}
      <div className="absolute inset-0">
        <KenBurns className="block h-full w-full">
          <img
            src={HERO_IMAGE}
            alt=""
            aria-hidden
            className="h-full w-full object-cover object-center"
            loading="eager"
            fetchPriority="high"
            decoding="sync"
          />
        </KenBurns>
      </div>

      {/* Scrim vertical: sostiene la nav arriba y el buscador abajo. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(18,16,14,.50) 0%,rgba(18,16,14,.08) 24%,rgba(18,16,14,.30) 52%,rgba(18,16,14,.86) 100%)",
        }}
      />
      {/* Scrim horizontal: el texto pasó a la izquierda y necesita piso propio;
          se abre a transparente antes del 76% para no apagar el atardecer. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg,rgba(18,16,14,.62) 0%,rgba(18,16,14,.20) 48%,rgba(18,16,14,0) 76%)",
        }}
      />

      <div className="relative z-[3] mx-auto w-full max-w-[1240px]">
        <HeroReveal>
          <div className="flex items-center gap-[14px]">
            <span className="h-px w-[38px] bg-[rgba(245,238,225,.55)]" />
            <span className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.32em] text-[rgba(245,238,225,.86)]">
              {t("kicker")}
            </span>
          </div>

          <h1
            className="font-display m-0 mt-[22px] text-balance font-normal leading-[0.94] tracking-[-0.028em] text-[#F8F3E8]"
            style={{
              fontSize: "clamp(46px,7.2vw,116px)",
              textShadow: "0 2px 40px rgba(18,16,14,.35)",
            }}
          >
            {t("title")}
            <br />
            <span className="font-light italic">{t("titleAccent")}</span>
          </h1>

          <p
            className="m-0 mt-[26px] max-w-[540px] text-pretty font-light leading-[1.62] text-[rgba(248,243,232,.9)]"
            style={{ fontSize: "clamp(16px,1.25vw,19.5px)" }}
          >
            {t("subtitle")}
          </p>

          {children ? (
            <div className="mt-[clamp(34px,4.6vh,54px)]">
              {children}
              <p className="m-0 mt-[14px] px-[2px] text-[12.5px] tracking-[.02em] text-[rgba(248,243,232,.62)]">
                {t("trust")}
              </p>
            </div>
          ) : null}
        </HeroReveal>
      </div>
    </header>
  );
}
