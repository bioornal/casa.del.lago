"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { GalleryLightbox, type GalleryItem } from "./GalleryLightbox";

/**
 * Relato en imágenes — grilla bento compacta con diez fotos reales del bucket
 * "imagenes". Todas visibles; cada tile abre el lightbox en su índice. El orden
 * de PHOTOS sigue el orden visual de la grilla, así la numeración 01–10 es
 * correlativa en pantalla y coincide con el contador del lightbox (y la
 * navegación prev/next respeta ese mismo orden).
 *
 * El set del lodge es casi todo vertical o cuadrado (son exports de Instagram),
 * así que la asignación va por forma. Medido en desktop, las cajas del grid son:
 * hero 578×430 (1.34), altos 282×430 (0.66), ancho 578×208 (2.78) y los "1×1"
 * 282×208 — que NO son cuadrados sino apaisados (1.35). De ahí el reparto:
 *
 *  - la 14, única apaisada del set, al tile hero;
 *  - la cuadrada 20 a un tile de 1.35, que es donde menos pierde;
 *  - las más verticales (9, 5) a los tiles altos de 0.66;
 *  - la 11 al tile ancho: es archivo vertical, pero su composición vive en una
 *    banda central horizontal y aguanta el 2.78 sin descuartizarse.
 *
 * Las verticales que caen en tiles apaisados (17, 3, 4, 6, 1) llevan encuadre
 * propio —`pos` acá o PHOTO_TWEAKS en ImageSlot— para que el recorte conserve
 * el motivo y no el piso.
 */
const PHOTOS: GalleryItem[] = [
  { label: "El agua", photo: "14.jpeg" },              // 0 · pileta + lago (la apaisada)
  { label: "La pileta", photo: "9.jpeg" },             // 1 · turquesa entre los árboles
  { label: "La noche", photo: "5.jpeg" },              // 2 · guirnaldas encendidas
  { label: "El quincho", photo: "17.jpeg" },           // 3 · mesa larga, mate y termo
  { label: "El atardecer", photo: "3.jpeg" },          // 4 · kayak familiar contra el sol
  { label: "La remada", photo: "4.jpeg" },             // 5 · POV hacia el monte cerrado
  { label: "El fuego", photo: "6.jpeg" },              // 6 · verduras y leña
  { label: "Desde el agua", photo: "11.jpeg" },        // 7 · el complejo desde el lago (H)
  { label: "El descanso", photo: "20.jpeg" },          // 8 · dormitorio al lago (1:1)
  { label: "Adentro", photo: "1.jpeg" },               // 9 · living con vista al lago
];

/** Tiles de la grilla (orden = colocación en el grid). `at` apunta a PHOTOS. */
const TILES: { key: string; at: number; span: string; pos?: string }[] = [
  { key: "agua", at: 0, span: "col-span-2 row-span-1 md:row-span-2" },        // 1.34
  { key: "pileta", at: 1, span: "col-span-1 row-span-2" },                    // 0.66
  { key: "noche", at: 2, span: "col-span-1 row-span-2" },                     // 0.66
  // Las tres que siguen son verticales en cajas apaisadas: el recorte es fuerte
  // y acá juega a favor —entran a la grilla sin robarle protagonismo al lago—,
  // pero cada una necesita su encuadre (ver PHOTO_TWEAKS en ImageSlot).
  { key: "quincho", at: 3, span: "col-span-1 row-span-1" },                   // 1.35
  { key: "atardecer", at: 4, span: "col-span-1 row-span-1", pos: "50% 45%" },
  { key: "remada", at: 5, span: "col-span-1 row-span-1" },
  // La tabla y el fuego forman una franja a media altura.
  { key: "fuego", at: 6, span: "col-span-1 row-span-1", pos: "50% 55%" },
  { key: "lago", at: 7, span: "col-span-2 row-span-1" },                      // 2.78
  { key: "descanso", at: 8, span: "col-span-1 row-span-1" },                  // 1.35
  { key: "adentro", at: 9, span: "col-span-1 row-span-1" },                   // 1.35
];

export function RelatoImagenes() {
  const t = useTranslations("galeria");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <section id="galeria" className="relative bg-arena py-16 md:py-[110px] overflow-hidden">
      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-5 mb-9 md:mb-[48px]">
          <div className="max-w-[560px]">
            <div>
              <Kicker>{t("kicker")}</Kicker>
            </div>
            <div>
              <h2
                className="font-display font-normal tracking-[-0.01em]"
                style={{ fontSize: "clamp(30px,4.4vw,52px)", margin: "14px 0 0" }}
              >
                {t("title")}
              </h2>
            </div>
          </div>
          {/* La fogata se ancla AL BOTÓN, no a la sección: centrada con
              left-1/2 queda alineada con él sea cual sea su ancho —"Ver
              completa" / "View full" / "Ver completa" miden distinto— y en
              cualquier viewport, sin porcentajes a ojo. Sube al aire del
              padding superior con bottom-full. */}
          <div className="relative">

            <button
              type="button"
              onClick={() => openAt(0)}
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-carbon transition-colors duration-300 hover:text-terracota"
            >
              {t("viewFull")}
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        {/* Grilla bento: 2 col mobile, 4 col desktop — las 10 fotos visibles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-[14px] [grid-auto-rows:150px] md:[grid-auto-rows:208px]">
          {TILES.map((tile) => (
            // El <div> intermedio no es redundante: lleva las clases de span de
            // la grilla.
            <div key={tile.key} className={`${tile.span} h-full`}>
              <button
                type="button"
                onClick={() => openAt(tile.at)}
                aria-label={PHOTOS[tile.at].label}
                className="group relative block h-full w-full overflow-hidden rounded-[6px] cursor-zoom-in"
                style={{ background: "#d8cfbf" }}
              >
                <ImageSlot
                  label={PHOTOS[tile.at].label}
                  photo={PHOTOS[tile.at].photo}
                  position={tile.pos}
                  className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-[1.04]"
                />

                {/* Número (orden narrativo) — siempre visible */}
                <span className="pointer-events-none absolute top-3 left-4 text-[11px] tracking-[0.2em] text-marfil/85 [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
                  {String(tile.at + 1).padStart(2, "0")}
                </span>

                {/* Epígrafe: visible en mobile, aparece al hover en desktop */}
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pt-12 pb-3.5 text-left md:translate-y-2 md:opacity-0 transition-all duration-500 ease-out md:group-hover:translate-y-0 md:group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(to top, rgba(20,18,14,.68), rgba(20,18,14,0))",
                  }}
                >
                  <span className="block font-display text-[17px] leading-tight text-marfil">
                    {t(`relato.frames.${tile.key}.t`)}
                  </span>
                  <span className="mt-0.5 hidden md:block text-[12px] font-light leading-snug text-marfil/75">
                    {t(`relato.frames.${tile.key}.c`)}
                  </span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <GalleryLightbox
        items={PHOTOS}
        open={open}
        index={index}
        onClose={() => setOpen(false)}
        onIndex={setIndex}
      />
    </section>
  );
}
