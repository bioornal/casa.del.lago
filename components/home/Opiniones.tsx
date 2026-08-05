import { useTranslations, useFormatter } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { FICHA_URL, type ReviewsAggregate, type Testimonio } from "@/lib/reviews/testimonios";

/**
 * Opiniones — prueba social con reseñas REALES de la ficha de Google, copiadas
 * a mano y administradas desde /admin/opiniones (tabla `testimonials`).
 *
 * ⚠ Nada de esta sección se inventa. Sin testimonios publicados se muestra sólo
 * el agregado —el puntaje de la ficha— y el link a Google. Ese es el estado
 * correcto mientras no haya textos reales: media sección verdadera antes que
 * una entera con relleno.
 *
 * Se muestra una SELECCIÓN, y el copy lo dice ("algunas de las reseñas" en la
 * bajada, más el pie de atribución). Si en algún momento se recorta el set,
 * cuidar que el copy siga siendo cierto.
 *
 * OJO con el JSON-LD: NO agregar `aggregateRating` a LODGING_JSONLD con estos
 * números. Google prohíbe el self-serving review markup para LodgingBusiness
 * —reseñas de terceros marcadas como propias— y expone el sitio a una acción
 * manual. Por eso en app/[locale]/page.tsx sigue en `undefined`.
 */

const STAR_PATH = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z";

function FilaEstrellas({ size }: { size: number }) {
  return (
    <span className="flex shrink-0" style={{ gap: size * 0.16 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

/**
 * Estrellas con relleno parcial: dos filas idénticas superpuestas, la de arriba
 * recortada al porcentaje. Es la única forma de que el 4,7 se vea como 4,7 y no
 * redondeado a 5. Decorativas: el valor ya está en texto al lado.
 */
function Estrellas({ value, size = 14 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, value / 5)) * 100;
  return (
    <span className="relative inline-flex align-middle" aria-hidden>
      <span className="text-borde-medio">
        <FilaEstrellas size={size} />
      </span>
      <span
        className="absolute inset-y-0 left-0 flex overflow-hidden text-atardecer"
        style={{ width: `${pct}%` }}
      >
        <FilaEstrellas size={size} />
      </span>
    </span>
  );
}

export function Opiniones({
  testimonios,
  agregado,
}: {
  testimonios: Testimonio[];
  agregado: ReviewsAggregate;
}) {
  const t = useTranslations("opiniones");
  const format = useFormatter();
  // 4,7 en es/pt y 4.7 en en: el separador decimal lo pone el locale.
  const ratingLabel = format.number(agregado.rating, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const hayTestimonios = testimonios.length > 0;

  return (
    <section
      id="opiniones"
      className="bg-arena-clara px-[clamp(20px,4vw,56px)] py-[clamp(80px,11vh,140px)]"
    >
      <div className="mx-auto max-w-[1240px]">
        <div
          className={`grid grid-cols-1 items-start gap-[clamp(36px,6vw,88px)] ${
            // Sin testimonios no hay segunda columna que sostener: el agregado
            // pasa a una sola columna angosta en vez de quedar flotando al
            // costado de un hueco.
            hayTestimonios ? "md:grid-cols-[minmax(0,.9fr)_minmax(0,1.7fr)]" : "max-w-[620px]"
          }`}
        >
          {/* Columna izquierda: el dato duro. Sticky en desktop para que el 4,7
              acompañe el scroll de las tarjetas —es el argumento, no un adorno. */}
          <div className={hayTestimonios ? "md:sticky md:top-[120px]" : undefined}>
            <div>
              <Kicker>{t("kicker")}</Kicker>
            </div>
            <h2
              className="font-display mt-[22px] text-balance font-normal leading-[1.14] tracking-[-0.02em] text-carbon"
              style={{ fontSize: "clamp(28px,3.2vw,44px)" }}
            >
              {t("title")}
            </h2>
            <p className="mt-[22px] max-w-[420px] text-pretty text-[16px] font-light leading-[1.72] text-cuerpo">
              {t(hayTestimonios ? "body" : "bodyShort")}
            </p>

            <div className="mt-[clamp(28px,4vw,44px)] border-t border-borde-medio pt-[22px]">
              <div className="flex items-end gap-[16px]">
                <span
                  className="font-display font-normal leading-[.82] tracking-[-0.03em] text-carbon"
                  style={{ fontSize: "clamp(52px,6.4vw,78px)" }}
                >
                  {ratingLabel}
                </span>
                <div className="pb-[7px]">
                  <Estrellas value={agregado.rating} size={15} />
                  <p className="mt-[9px] text-[13.5px] text-muted">
                    {t("reviews", { n: agregado.count })}
                  </p>
                </div>
              </div>
              <a
                href={FICHA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[20px] inline-flex items-center gap-[9px] border-b border-[#b8d2da] pb-[5px] text-[13px] uppercase tracking-[.08em] text-lago no-underline transition-[gap,border-color] duration-300 hover:gap-[16px] hover:border-lago"
              >
                {t("googleCta")}
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>

          {/* Tarjetas: hairlines, no cajas — es el mismo recurso que Cómo llegar
              y la tira de El lugar, y deja respirar el texto de cada reseña. */}
          {hayTestimonios && (
            <div>
              <div className="grid grid-cols-1 gap-x-[clamp(24px,3vw,48px)] gap-y-[clamp(26px,3vw,40px)] sm:grid-cols-2">
                {testimonios.map((r) => (
                  <figure key={r.id} className="m-0 border-t border-borde-medio pt-[18px]">
                    <Estrellas value={r.rating} size={13} />
                    {/* `lang` propio: las reseñas quedan en el idioma en que
                        fueron escritas, que no siempre es el del sitio. */}
                    <blockquote
                      lang={r.lang}
                      className="m-0 mt-[14px] text-pretty text-[15px] font-light leading-[1.72] text-cuerpo"
                    >
                      “{r.body}”
                    </blockquote>
                    <figcaption className="mt-[15px]">
                      <span className="font-display block text-[16px] font-normal text-carbon">
                        {r.author}
                      </span>
                      <span className="mt-[2px] block text-[12.5px] text-muted">{r.dateLabel}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-[clamp(26px,3vw,36px)] text-[12.5px] leading-relaxed text-muted">
                {t("attribution")}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
