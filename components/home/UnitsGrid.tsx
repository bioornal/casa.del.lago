import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Link } from "@/lib/i18n/navigation";
import { UNITS } from "@/lib/units";
import type { UnitSlug } from "@/lib/units";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

// Dos columnas iguales con foto 4/3, como el diseño. Antes era un díptico
// asimétrico (1.28fr/1fr con la segunda bajada 92px): llenaba mejor el ancho y
// expresaba la jerarquía de precio, pero no es lo que pide el diseño y la
// asimetría no se sostenía al compararlas lado a lado.
export function UnitsGrid({ prices }: { prices: Record<UnitSlug, number> }) {
  const t = useTranslations("units");

  return (
    // Sin padding arriba: la sección "La casa" ya aporta su propio padding
    // inferior, y sumar los dos abría un hueco que el diseño no tiene.
    <section
      id="cabanas"
      className="relative bg-marfil px-[clamp(20px,4vw,56px)] pb-[clamp(80px,11vh,140px)]"
    >
      <div className="relative z-[1] mx-auto max-w-[1240px]">
        {/* Header con filete inferior */}
        <div className="flex flex-wrap items-end justify-between gap-8 border-b border-borde-medio pb-[clamp(32px,4vw,52px)]">
          <div>
            <div>
              <Kicker>{t("sectionKicker")}</Kicker>
            </div>
            <div>
              <h2
                className="font-display mt-[22px] font-normal leading-[1.14] tracking-[-0.02em] text-carbon"
                style={{ fontSize: "clamp(28px,3.2vw,44px)" }}
              >
                {t("sectionTitle")}
              </h2>
            </div>
          </div>

          <div>
            <Link
              href="/tarifas"
              className="inline-flex items-center gap-[9px] whitespace-nowrap border-b border-[#b8d2da] pb-[5px] text-[12px] font-bold uppercase tracking-[.16em] text-lago no-underline transition-[gap,border-color] duration-300 hover:gap-[16px] hover:border-lago"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>

        <div className="mt-[clamp(36px,4.5vw,60px)] grid grid-cols-1 gap-[clamp(28px,3.4vw,52px)] sm:grid-cols-2">
          {UNITS.map((unit, i) => {
            const slug = unit.slug as UnitSlug;
            const name = t(`${slug}.name` as `${UnitSlug}.name`);

            return (
              <Link
                key={slug}
                href={`/departamentos/${slug}`}
                className="group block text-inherit no-underline"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-slot">
                  <ImageSlot
                    label={name}
                    className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-[1.04]"
                  />
                </div>

                {/* Índice editorial */}
                <div className="mt-5 flex items-center gap-[14px]">
                  <span className="text-[10.5px] tracking-[.2em] text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-borde-medio transition-colors duration-500 group-hover:bg-bronce" />
                </div>

                {/* Nombre + precio */}
                <div className="mt-[14px] flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
                  <h3
                    className="font-display m-0 font-normal tracking-[-0.015em] text-carbon"
                    style={{ fontSize: "clamp(22px,1.9vw,28px)" }}
                  >
                    {name}
                  </h3>
                  <p className="m-0 whitespace-nowrap text-[13px] font-semibold tracking-[.01em] text-terracota">
                    {t("fromPrice", { price: money(prices[slug]) })}{" "}
                    <span className="font-normal text-muted">{t("perNight")}</span>
                  </p>
                </div>

                <p className="mt-[10px] text-[14.5px] font-light leading-[1.6] text-cuerpo">
                  {t(`${slug}.sub` as `${UnitSlug}.sub`)}
                </p>
              </Link>
            );
          })}
        </div>

        <div>
          <p className="mt-[clamp(30px,3.4vw,44px)] text-[14.5px] font-light leading-[1.6] text-muted">
            {t("note")}
          </p>
        </div>
      </div>
    </section>
  );
}
