import { useTranslations } from "next-intl";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Parallax } from "@/components/motion/Parallax";

/**
 * El lugar — banda cinematográfica full-bleed sobre el petróleo de la marca.
 *
 * El fondo es `lago` (#155e75), no `lago-hover` (#0e4a5e): el oscuro queda
 * reservado para la banda de la foto, y así los dos tonos se leen como capas.
 * El kicker va en cyan claro (#7FD4E2) y no en turquesa: sobre este fondo el
 * turquesa de `<Kicker>` casi no contrasta.
 *
 * FOTO: el atardecer sobre el lago en su versión 16:9 (ChatGPT1.jpg), extendida
 * a partir de la 7.jpeg original —que es vertical— para que entre en la banda.
 * Con 1.78 de ratio el recorte a ~3:1 es leve y el horizonte queda centrado.
 */
const ITEMS = [
  { key: "nature", num: "01" },
  { key: "gastronomy", num: "02" },
  { key: "frontier", num: "03" },
  { key: "activities", num: "04" },
] as const;

export function Experiencias() {
  const t = useTranslations("experiencias");

  return (
    <section id="lugar" className="relative overflow-hidden bg-lago text-marfil">

      {/* Header editorial: kicker + título a la izquierda, bajada a la derecha */}
      <div className="relative z-[1] mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-[clamp(32px,6vw,96px)] px-[clamp(20px,4vw,56px)] py-[clamp(72px,10vh,120px)] md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div>
          <div>
            <span className="text-[11.5px] font-bold uppercase tracking-[0.2em] text-[#7FD4E2]">
              {t("kicker")}
            </span>
          </div>
          <div>
            <h2
              className="font-display m-0 mt-[22px] font-normal leading-[1.1] tracking-[-0.022em] text-marfil"
              style={{ fontSize: "clamp(30px,3.6vw,50px)" }}
            >
              {t("title")}
            </h2>
          </div>
        </div>
        <div className="pt-[clamp(0px,1.2vw,14px)]">
          <p className="m-0 text-pretty text-[16px] font-light leading-[1.72] text-[rgba(245,238,225,.86)]">
            {t("body")}
          </p>
        </div>
      </div>

      {/* Banda full-bleed: el lago en su formato panorámico natural.
          El wrapper lleva relative z-[1] para que la foto opaca quede por
          encima de las figuras decorativas. */}
      <div className="relative z-[1]">
        <div
          className="relative h-[clamp(280px,46vh,520px)] overflow-hidden"
          style={{ background: "#0E4A5E" }}
        >
          {/* Imagen 80px más alta que la banda: margen para el recorrido del parallax */}
          <Parallax speed={-40} className="absolute inset-x-0 top-0 h-[calc(100%+80px)]">
            <ImageSlot
              label="El lago Urugua-í al atardecer"
              photo="ChatGPT1.jpg"
              className="h-full w-full"
            />
          </Parallax>

          {/* Scrim + caption anclado al container */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 pt-20"
            style={{ background: "linear-gradient(to top, rgba(8,32,42,.6), rgba(8,32,42,0))" }}
          >
            <div className="px-[clamp(20px,4vw,56px)] pb-[22px]">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[rgba(245,238,225,.9)] [text-shadow:0_1px_12px_rgba(18,16,14,.6)]">
                {t("caption")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tira de ítems: numeración + título + bajada */}
      <div className="relative z-[1] mx-auto max-w-[1240px] px-[clamp(20px,4vw,56px)] pt-[clamp(48px,6vh,80px)] pb-[clamp(72px,10vh,120px)]">
        <div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[clamp(24px,3vw,44px)]">
            {ITEMS.map(({ key, num }) => (
              <div key={key} className="group">
                <div className="h-px bg-[rgba(245,238,225,.28)]" />
                <span className="mt-[14px] block text-[10.5px] font-semibold tracking-[0.2em] text-[rgba(245,238,225,.55)]">
                  {num}
                </span>
                <h3 className="font-display mt-[10px] mb-2 text-[20px] font-normal tracking-[-0.01em] text-marfil transition-colors duration-300 group-hover:text-[#A8E0EA]">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="m-0 text-[14.5px] font-light leading-[1.6] text-[rgba(245,238,225,.74)]">
                  {t(`items.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
