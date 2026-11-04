import { useTranslations } from "next-intl";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Parallax } from "@/components/motion/Parallax";

/**
 * La casa — panorámica del lago al atardecer, a todo el ancho, con el texto
 * encima (propuesta "B · Panorámica", elegida por el dueño 2026-11-04).
 *
 * FOTO: hero/ChatGPT1.jpg (16:9). En escritorio el recorte es casi nulo; en
 * celular la caja es vertical y se queda con la franja central-derecha, donde
 * está el sol. El scrim oscurece desde la izquierda (escritorio) o desde abajo
 * (celular), que es donde va el texto.
 *
 * El alto mínimo está en `vw` con tope: el texto va en el flujo (no absoluto),
 * así que si en/pt ocupan más líneas la sección crece en vez de cortarse.
 *
 * UNIÓN CON EL HERO: las dos son fotos a todo el ancho, una encima de la otra.
 * El hero se funde al pie a HERO_JOIN y esta sección arranca desde ese mismo
 * tono y se abre a la foto, así no queda una línea marcada entre las dos.
 * El texto usa el mismo padding lateral y contenedor que el hero para quedar
 * alineado con él.
 */
const HERO_JOIN = "18,16,14"; // rgb del pie del hero (Hero.tsx)
export function Manifiesto() {
  const t = useTranslations("manifiesto");

  return (
    <section
      id="casa"
      // -mt-px: el alto del hero (100svh) suele dar fracciones de píxel y el
      // borde podía dejar ver el marfil del body como un hilo claro.
      className="relative isolate -mt-px flex min-h-[clamp(620px,56vw,780px)] items-end overflow-hidden bg-carbon text-marfil"
    >
      {/* Foto 80px más alta que la sección: recorrido del parallax. */}
      <Parallax speed={-40} className="absolute inset-x-0 top-0 -z-10 h-[calc(100%+80px)]">
        <ImageSlot
          label={t("photoAlt")}
          photo="hero/ChatGPT1.jpg"
          // Sin el gris claro de ImageSlot: mientras la foto carga se ve el
          // fondo oscuro de la sección y la unión con el hero no se rompe.
          className="h-full w-full bg-transparent!"
          position="62% 62%"
          sizes="100vw"
        />
      </Parallax>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,18,15,0)_18%,rgba(20,18,15,.55)_48%,rgba(20,18,15,.86)_100%)] md:bg-[linear-gradient(90deg,rgba(20,18,15,.8)_0%,rgba(20,18,15,.48)_42%,rgba(20,18,15,0)_72%)]"
      />
      {/* Fundido desde el hero: sólido arriba, se abre a la foto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42%]"
        style={{
          background: `linear-gradient(180deg,rgb(${HERO_JOIN}) 0%,rgba(${HERO_JOIN},.72) 30%,rgba(${HERO_JOIN},.28) 65%,rgba(${HERO_JOIN},0) 100%)`,
        }}
      />

      <div className="mx-auto w-full max-w-[calc(1240px_+_2*clamp(20px,4vw,56px))] px-[clamp(20px,4vw,56px)] pb-[clamp(48px,9vh,104px)] pt-40">
        <div className="max-w-[580px]">
          <p className="m-0 flex items-center gap-3.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-arena">
            <span aria-hidden="true" className="block h-px w-8 bg-arena" />
            {t("kicker")}
          </p>

          <h2
            className="font-display m-0 mt-[20px] text-balance font-normal leading-[1.08] tracking-[-0.02em] text-marfil"
            style={{ fontSize: "clamp(31px,4.1vw,56px)" }}
          >
            {t.rich("title", { em: (chunks) => <em className="font-light">{chunks}</em> })}
          </h2>

          <p className="m-0 mt-6 max-w-[440px] text-pretty text-[16px] font-light leading-[1.75] text-[rgba(245,238,225,.88)]">
            {t("body")}
          </p>

          <a
            href="#lugar"
            className="mt-4 inline-flex min-h-[44px] items-center gap-[9px] border-b border-[rgba(245,238,225,.5)] text-[13px] uppercase tracking-[.08em] text-marfil no-underline transition-[gap,border-color] duration-300 hover:gap-[16px] hover:border-marfil"
          >
            {t("link")}
          </a>
        </div>
      </div>

      {/* Epígrafe manuscrito: sólo con ancho de sobra, para no pisar el texto. */}
      <p className="font-accent absolute bottom-10 right-[clamp(20px,5vw,64px)] m-0 hidden text-[26px] text-atardecer lg:block">
        {t("caption")}
      </p>
    </section>
  );
}
