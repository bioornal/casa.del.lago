import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Reveal } from "@/components/motion/Reveal";
import { Asentar } from "@/components/motion/Asentar";
import { RevealTitle } from "@/components/motion/RevealTitle";
import { Parallax } from "@/components/motion/Parallax";
import { FiguraAgua } from "@/components/motion/FiguraAgua";
import { Link } from "@/lib/i18n/navigation";
import { UNITS } from "@/lib/units";
import type { UnitSlug } from "@/lib/units";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

// Díptico asimétrico: son DOS cabañas, no tres. Una grilla de 3 columnas dejaba
// una columna muerta y achicaba las fotos a un tercio del ancho. Acá la primera
// unidad (la más grande y más cara) toma ~57% y la segunda ~43%, desplazada
// hacia abajo: la asimetría llena el ancho y a la vez expresa la jerarquía real
// entre las dos. Si algún día vuelven a ser tres, esto hay que repensarlo.
const COLS = "lg:grid-cols-[1.28fr_1fr]";

interface UnitsGridProps {
  /** Tarifa pública por noche (tarjeta), desde Supabase vía getRateSettings. */
  prices: Record<UnitSlug, number>;
}

export function UnitsGrid({ prices }: UnitsGridProps) {
  const t = useTranslations("units");

  return (
    <section id="cabanas" className="relative bg-arena-clara py-16 md:py-[130px]">
      <FiguraAgua kind="bambu" className="bottom-2 left-[2%]" size={115} />
      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12">
        {/* Section header */}
        <div className="mb-[44px] md:mb-[60px] flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <Kicker>{t("sectionKicker")}</Kicker>
            </Reveal>
            <RevealTitle delay={0.08}>
              <h2
                className="font-display mt-4 font-normal leading-[1.05] tracking-[-0.01em] text-carbon"
                style={{ fontSize: "clamp(28px,4vw,52px)" }}
              >
                {t("sectionTitle")}
              </h2>
            </RevealTitle>
          </div>

          <Reveal delay={0.12}>
            <Link
              href="/tarifas"
              className="inline-flex items-center gap-[9px] self-end border-b border-[#c9bfae] pb-[5px] text-[13px] uppercase tracking-[.08em] text-carbon no-underline transition-[gap] duration-300 hover:gap-[16px]"
            >
              {t("viewAll")}
            </Link>
          </Reveal>
        </div>

        {/* Díptico */}
        <Asentar className={`grid grid-cols-1 ${COLS} gap-y-14 gap-x-[clamp(28px,4.5vw,80px)]`}>
          {UNITS.map((unit, i) => {
            const slug = unit.slug as UnitSlug;
            const featured = i === 0;
            const name = t(`${slug}.name` as `${UnitSlug}.name`);

            return (
              <Link
                key={slug}
                href={`/departamentos/${slug}`}
                className={`group block text-inherit no-underline transition-transform duration-500 ease-[cubic-bezier(.16,.84,.44,1)] hover:-translate-y-2 ${
                  // La segunda baja para romper la línea del díptico. Solo en lg:
                  // apilado, un margen así dejaría un hueco sin sentido.
                  featured ? "" : "lg:mt-[92px]"
                }`}
              >
                {/* Foto */}
                <div
                  className={`overflow-hidden rounded-[3px] bg-slot ${
                    featured
                      ? "h-[340px] sm:h-[460px] lg:h-[600px]"
                      : "h-[300px] sm:h-[420px] lg:h-[468px]"
                  }`}
                >
                  <Parallax speed={-16}>
                    <ImageSlot
                      label={name}
                      className={`w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-105 ${
                        featured
                          ? "h-[356px] sm:h-[476px] lg:h-[616px]"
                          : "h-[316px] sm:h-[436px] lg:h-[484px]"
                      }`}
                    />
                  </Parallax>
                </div>

                {/* Índice editorial */}
                <div className="mt-6 flex items-center gap-3">
                  <span className="text-[11px] tracking-[.22em] text-bronce">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-[#d8cfc0] transition-colors duration-500 group-hover:bg-bronce" />
                </div>

                {/* Nombre + precio */}
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3
                    className={`font-display m-0 font-medium text-carbon ${
                      featured ? "text-[28px] md:text-[38px]" : "text-[24px] md:text-[30px]"
                    }`}
                  >
                    {name}
                  </h3>
                  <span className="shrink-0 text-[13px] text-bronce">
                    {t("fromPrice", { price: money(prices[slug]) })}
                  </span>
                </div>

                {/* Ficha corta */}
                <div
                  className={`mt-2 tracking-[.02em] text-muted ${
                    featured ? "text-[14px] md:max-w-[46ch]" : "text-[13px] md:max-w-[38ch]"
                  }`}
                >
                  {t(`${slug}.sub` as `${UnitSlug}.sub`)}
                </div>
              </Link>
            );
          })}
        </Asentar>
      </div>
    </section>
  );
}
