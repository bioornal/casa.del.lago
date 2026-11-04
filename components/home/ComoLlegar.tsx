import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Parallax } from "@/components/motion/Parallax";

const ROWS = ["igr", "cataratas", "wanda", "foz", "cde", "posadas"] as const;

// Banda de entrada: el lago al anochecer (imagen generada con IA; en el bucket
// quedó con el nombre cruzado, "secciones/GraficosHojas.jpg"). Arriba arranca del mismo
// petróleo con el que termina "El lugar" (bg-lago, #155e75) — el cielo de la
// foto es casi de ese tono, así que la unión no se ve — y abajo la bruma del
// agua se disuelve en el marfil de esta sección.
const UNION =
  "linear-gradient(180deg,rgb(21,94,117) 0%,rgba(21,94,117,.55) 14%,rgba(21,94,117,0) 36%,rgba(245,238,225,0) 56%,rgba(245,238,225,.24) 70%,rgba(245,238,225,.6) 85%,rgb(245,238,225) 100%)";

export function ComoLlegar() {
  const t = useTranslations("comoLlegar");

  return (
    // -mt-px: guarda contra el hilo de fracción de píxel con "El lugar".
    <section id="llegar" className="-mt-px bg-marfil">
      {/* Fondo petróleo → marfil (no bg-lago liso): el alto cae en fracciones
          de píxel y la última fila dejaba ver el petróleo como un hilo oscuro
          sobre el marfil. Arriba sigue siendo petróleo mientras carga la foto. */}
      <div className="relative h-[clamp(260px,32vw,480px)] overflow-hidden bg-[linear-gradient(180deg,#155e75_0%,#155e75_55%,#f5eee1_100%)]">
        {/* Parallax suave hacia abajo: la foto va más lenta que la página y la
            banda gana profundidad. Sobra 80px arriba para ese recorrido. */}
        <Parallax speed={70} className="absolute inset-x-0 -top-[80px] h-[calc(100%+80px)]">
          <ImageSlot
            label={t("photoAlt")}
            photo="secciones/GraficosHojas.jpg"
            className="h-full w-full bg-transparent!"
            position="20% 55%"
            sizes="100vw"
          />
        </Parallax>
        {/* -bottom-[2px]: el velo pasa apenas el borde (la banda lo recorta), así
            la última fila de fracción de píxel también queda cubierta de marfil
            y la foto no asoma como un hilo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -bottom-[2px]"
          style={{ background: UNION }}
        />
      </div>

      {/* Aire de marfil liso entre el final del fundido y el texto (pedido
          del dueño: que la foto no "toque" el título). */}
      <div className="px-[clamp(20px,4vw,56px)] pt-[clamp(64px,8vw,120px)] pb-[clamp(80px,11vh,140px)]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-[clamp(36px,6vw,96px)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <div>
            <Kicker>{t("kicker")}</Kicker>
          </div>
          <div>
            <h2
              className="font-display mt-[22px] text-balance font-normal leading-[1.14] tracking-[-0.02em] text-carbon"
              style={{ fontSize: "clamp(28px,3.2vw,44px)" }}
            >
              {t("title")}
            </h2>
          </div>
          <div>
            <p className="mt-[22px] max-w-[420px] text-pretty text-[16px] font-light leading-[1.72] text-cuerpo">
              {t("body")}
            </p>
            <p className="mt-[22px] text-[14.5px] font-medium tracking-[.01em] text-carbon">
              {t("checkin")}
            </p>
          </div>
        </div>

        <div>
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
        </div>
      </div>
      </div>
    </section>
  );
}
