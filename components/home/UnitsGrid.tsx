import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot, UNIT_COVER_PHOTOS } from "@/components/ui/ImageSlot";
import { Ilustracion, LAMINA_BOTANICA } from "@/components/ui/Ilustracion";
import { Parallax } from "@/components/motion/Parallax";
import { RevelarFila, type LadoCortina } from "@/components/motion/RevelarFila";
import { Link } from "@/lib/i18n/navigation";
import { UNITS } from "@/lib/units";
import type { UnitSlug } from "@/lib/units";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

// Foto chica de cada fila: un interior con el lago en la ventana. Sigue al slug
// interno, igual que UNIT_COVER_PHOTOS (cab arriba = Aguaribay visible).
const INTERIOR: Record<UnitSlug, string> = {
  aratiri: "cab arriba/5.jpeg", // el comedor con los ventanales al lago
  aguaribay: "cab abajo/10.jpeg", // living con ventana al lago
};
const COVER_POSITION: Partial<Record<UnitSlug, string>> = { aratiri: "50% 100%" };

/**
 * Cabañas — editorial alternado (propuesta "B", elegida 2026-11-04).
 *
 * Una fila por cabaña: foto grande + foto chica de un interior, número calado,
 * nombre, ficha 2×2 y botón a la ficha. Las filas alternan el lado de la foto.
 * En celular el orden es nombre → foto → texto (grid-template-areas).
 *
 * Fondo marfil liso con corte neto de color con La casa y El lugar, como el
 * resto de la home (se probó una bruma y un fundido a petróleo y se descartó).
 * La lámina botánica completa va detrás del título. Los efectos de scroll
 * viven en RevelarFila (la cortina de la foto, filetes, textos escalonados) y
 * Parallax (número y lámina); con ?sinfx=1 o reduced-motion todo queda quieto
 * y visible.
 */
export function UnitsGrid({ prices }: { prices: Record<UnitSlug, number> }) {
  const t = useTranslations("units");

  return (
    <section
      id="cabanas"
      // overflow-clip (no hidden): recorta la lámina sin volver a la sección un
      // contenedor de scroll.
      className="relative isolate overflow-clip bg-marfil px-[clamp(20px,4vw,56px)] pt-[clamp(72px,10vh,120px)] pb-[clamp(80px,11vh,140px)]"
    >
      {/* Lámina botánica, arriba a la derecha. Nunca detrás de un texto:
          - desktop: grande; baja por detrás de la FOTO de la primera fila (que
            por eso va a la derecha) y asoma por el costado y por arriba de
            ella. El encabezado se queda en el 56% izquierdo.
          - celular: el título ocupa todo el ancho, así que va chica y
            encuadrada en las palmas, en la esquina, por encima del título.
          Parallax hacia ARRIBA: se va por el borde superior, nunca baja. */}
      <Ilustracion
        {...LAMINA_BOTANICA}
        encuadre={{ proporcion: "928 / 600", posicion: "50% 0%" }}
        aclarar={1.1}
        sizes="150px"
        className="right-0 top-0 w-[150px] opacity-80 md:hidden"
      />
      <Ilustracion
        {...LAMINA_BOTANICA}
        aclarar={1.1}
        parallax={-40}
        sizes="620px"
        className="right-0 top-0 hidden w-[clamp(300px,42vw,620px)] md:block"
      />

      <div className="mx-auto max-w-[1240px]">
        {/* Encabezado en columna (el link debajo del título) y en el 56%
            izquierdo: la derecha queda para la lámina. */}
        <div className="border-b border-borde-medio pb-[clamp(28px,3.4vw,40px)]">
          <div className="max-w-[680px] md:max-w-[56%]">
            <Kicker>{t("sectionKicker")}</Kicker>
            <h2
              className="font-display m-0 mt-[18px] text-balance font-normal leading-[1.06] tracking-[-0.022em] text-carbon"
              style={{ fontSize: "clamp(32px,4vw,54px)" }}
            >
              {t.rich("sectionTitle", { em: (chunks) => <em className="font-light">{chunks}</em> })}
            </h2>
          </div>
          <Link
            href="/tarifas"
            className="mt-4 inline-flex min-h-[44px] items-center gap-[9px] whitespace-nowrap border-b border-[#b8d2da] text-[12px] font-bold uppercase tracking-[.16em] text-lago no-underline transition-[gap,border-color] duration-300 hover:gap-[16px] hover:border-lago"
          >
            {t("viewAll")}
          </Link>
        </div>

        <div className="mt-[clamp(48px,7vw,96px)] flex flex-col gap-[clamp(72px,10vw,136px)]">
          {UNITS.map((unit, i) => {
            const slug = unit.slug as UnitSlug;
            const name = t(`${slug}.name` as `${UnitSlug}.name`);
            // La primera fila lleva la foto a la DERECHA: la lámina de arriba a
            // la derecha baja por detrás de esa foto en vez de pasar por textos.
            const lado: LadoCortina = i % 2 === 0 ? "right" : "left";
            const derecha = lado === "right";
            const href = `/departamentos/${slug}`;
            const price = t("fromPrice", { price: money(prices[slug]) });
            const specs = [
              { label: t("specGuests"), value: t("guestsValue", { n: unit.specs.guests }) },
              { label: t("specBedrooms"), value: String(unit.specs.bedrooms) },
              { label: t("specArea"), value: `${unit.specs.area} m²` },
              { label: t("specOutdoor"), value: t("outdoorValue") },
            ];

            return (
              <RevelarFila
                key={slug}
                lado={lado}
                className={`grid grid-cols-1 items-center gap-x-[clamp(40px,7vw,104px)] gap-y-5 [grid-template-areas:'head'_'photo'_'body'] md:gap-y-0 ${
                  derecha
                    ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:[grid-template-areas:'head_photo'_'body_photo']"
                    : "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:[grid-template-areas:'photo_head'_'photo_body']"
                }`}
              >
                {/* Número + nombre */}
                <div className="flex items-baseline gap-4 [grid-area:head] md:block md:self-end">
                  <Parallax speed={36}>
                    <span
                      aria-hidden="true"
                      className="font-display block font-light leading-[.8] tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_var(--color-bronce)]"
                      style={{ fontSize: "clamp(54px,9vw,128px)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </Parallax>
                  <h3
                    data-escalon
                    className="font-display m-0 font-normal leading-none tracking-[-0.02em] text-carbon md:mt-6"
                    style={{ fontSize: "clamp(30px,3.5vw,48px)" }}
                  >
                    {/* Sin link: la foto y el botón ya llevan a la ficha, y un
                        link de 37px de alto quedaba chico para el dedo. */}
                    {name}
                  </h3>
                </div>

                {/* Fotos: la grande se abre como cortina, la chica sube después */}
                <div className="relative pb-[clamp(36px,4.5vw,60px)] [grid-area:photo]">
                  <Link href={href} tabIndex={-1} aria-hidden="true" className="group block">
                    <div data-cortina className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-slot">
                      <div data-cortina-img className="absolute inset-0">
                        <ImageSlot
                          label={name}
                          photo={UNIT_COVER_PHOTOS[slug]}
                          position={COVER_POSITION[slug]}
                          className="h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-[1.04]"
                          sizes="(max-width: 768px) 100vw, 680px"
                        />
                      </div>
                    </div>
                  </Link>
                  <div
                    data-flota
                    className={`absolute bottom-0 w-[32%] max-w-[230px] border-[5px] border-marfil shadow-card md:border-8 ${
                      derecha ? "right-3 md:right-auto md:-left-12" : "right-3 md:-right-12"
                    }`}
                  >
                    <ImageSlot
                      label={t("insetAlt", { name })}
                      photo={INTERIOR[slug]}
                      className="aspect-[5/6] w-full"
                      sizes="(max-width: 768px) 32vw, 230px"
                    />
                  </div>
                </div>

                {/* Texto, ficha y botón */}
                <div className="[grid-area:body] md:self-start">
                  <p data-escalon className="m-0 text-pretty text-[15.5px] font-light leading-[1.65] text-cuerpo md:mt-4 md:text-[16px]">
                    {t(`${slug}.feat` as `${UnitSlug}.feat`)}
                  </p>

                  <dl className="relative m-0 mt-5 grid grid-cols-2 md:mt-7">
                    <span data-linea aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left bg-borde-medio" />
                    {specs.map((s, k) => (
                      <div
                        key={s.label}
                        data-escalon
                        className={`border-b border-borde-medio py-3 md:py-[14px] ${k % 2 === 1 ? "border-l pl-4 md:pl-[22px]" : "pr-3"}`}
                      >
                        <dt className="text-[10.5px] font-semibold uppercase tracking-[.16em] text-muted md:text-[11px]">{s.label}</dt>
                        <dd className="font-display m-0 mt-1 text-[19px] leading-tight text-carbon md:text-[22px]">{s.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div data-escalon className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-7 md:mt-7">
                    <Link
                      href={href}
                      className="inline-flex min-h-[52px] items-center justify-between gap-4 rounded-[4px] bg-lago px-[20px] text-[12px] font-bold uppercase tracking-[.14em] text-marfil no-underline transition-colors duration-300 hover:bg-lago-hover sm:min-h-[50px] sm:justify-center sm:px-7"
                    >
                      <span>{t("cta")}</span>
                      <span className="font-semibold normal-case tracking-[.02em] text-[#f2c38a] sm:hidden">{price}</span>
                    </Link>
                    <p className="m-0 hidden text-[14px] text-cuerpo sm:block">
                      <strong className="font-semibold text-terracota">{price}</strong> {t("perNight")}
                    </p>
                  </div>
                </div>
              </RevelarFila>
            );
          })}
        </div>

        <p className="m-0 mt-[clamp(56px,7vw,88px)] max-w-[620px] text-[14.5px] font-light leading-[1.65] text-muted">
          {t("note")}
        </p>
      </div>
    </section>
  );
}
