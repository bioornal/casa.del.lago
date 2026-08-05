"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { GalleryLightbox, type GalleryItem } from "./GalleryLightbox";

/**
 * Relato en imágenes — grilla bento compacta alimentada por la carpeta `relato/`
 * del bucket: lifestyle y paisaje, sin cabaña identificable. Es a propósito —
 * las dos cabañas tienen su propia galería en su página, y acá se cuenta el
 * lugar, no el alojamiento.
 *
 * Los diez primeros items son los que se ven en la grilla; cada tile abre el
 * lightbox en su índice. El orden de PHOTOS sigue el orden visual, así la
 * numeración 01–10 es correlativa en pantalla y coincide con el contador del
 * lightbox. Del 11 al 17 son las fotos restantes de la carpeta: no tienen tile
 * y sólo se llega a ellas navegando con las flechas, que es lo que convierte
 * "Ver completa" en algo más que abrir la misma grilla en grande.
 *
 * El set es casi todo vertical (son exports de Instagram), así que la asignación
 * va por forma. Medido en desktop, las cajas del grid son: hero 578×430 (1.34),
 * altos 282×430 (0.66), ancho 578×208 (2.78) y los "1×1" 282×208 — que NO son
 * cuadrados sino apaisados (1.35). De ahí el reparto:
 *
 *  - IMG_1272, única apaisada de la carpeta, al tile hero: 1.34 contra 1.34;
 *  - las más verticales (IMG_1319 a 0.63, la 4 a 0.75) a los tiles altos;
 *  - la 7 al tile ancho: es archivo vertical, pero es puro horizonte a media
 *    altura, así que aguanta el 2.78 sin descuartizarse (ver PHOTO_TWEAKS).
 *
 * Las verticales que caen en tiles apaisados llevan encuadre propio —`pos` acá
 * o PHOTO_TWEAKS en ImageSlot— para que el recorte conserve el motivo.
 */
const PHOTOS: GalleryItem[] = [
  // Visibles en la grilla (01–10). El `label` es el alt; el epígrafe sale de
  // messages/*.json vía la `key` del TILE correspondiente.
  { label: "El atardecer", photo: "relato/IMG_1272.jpeg" },   // 0 · kayak y cielo rosado (H)
  { label: "La remada", photo: "relato/4.jpeg" },             // 1 · POV hacia el monte cerrado
  { label: "El mirador", photo: "relato/IMG_1319.jpeg" },     // 2 · dos personas frente al lago
  { label: "El mate", photo: "relato/IMG_1265.jpeg" },        // 3 · mate y termo contra el agua
  { label: "La fogata", photo: "relato/IMG_1270.jpeg" },      // 4 · el fuego en la orilla
  { label: "El fuego", photo: "relato/IMG_1316.jpeg" },       // 5 · parrilla y tabla de verduras
  { label: "El disco", photo: "relato/IMG_1276.jpeg" },       // 6 · el disco contra el atardecer
  { label: "El lago", photo: "relato/7.jpeg" },               // 7 · horizonte rosado (tile ancho)
  { label: "El kayak", photo: "relato/IMG_1292.jpeg" },       // 8 · remando de espaldas (H)
  { label: "La costa", photo: "relato/11.jpeg" },             // 9 · arboleda reflejada
  // Sólo en el lightbox (11–17).
  { label: "Kayak familiar al atardecer", photo: "relato/3.jpeg" },
  { label: "La cacerola al fuego", photo: "relato/IMG_1269.jpeg" },
  { label: "Calabaza a las brasas", photo: "relato/IMG_1275.jpeg" },
  { label: "El termo y el mate sobre la mesa", photo: "relato/IMG_1285.jpeg" },
  { label: "La costa con la vegetación en primer plano", photo: "relato/IMG_1290.jpeg" },
  { label: "Kayak con el sol bajo", photo: "relato/IMG_1291.jpeg" },
  { label: "La costa vista desde el agua", photo: "relato/IMG_1318.jpeg" },
];

/** Tiles de la grilla (orden = colocación en el grid). `at` apunta a PHOTOS. */
const TILES: { key: string; at: number; span: string; pos?: string }[] = [
  { key: "atardecer", at: 0, span: "col-span-2 row-span-1 md:row-span-2" },   // 1.34
  { key: "remada", at: 1, span: "col-span-1 row-span-2" },                    // 0.66
  { key: "mirador", at: 2, span: "col-span-1 row-span-2" },                   // 0.66
  // Las que siguen son verticales en cajas apaisadas: el recorte es fuerte y acá
  // juega a favor —entran a la grilla sin robarle protagonismo al lago—, pero
  // las que tienen el motivo fuera del centro necesitan su encuadre.
  { key: "mate", at: 3, span: "col-span-1 row-span-1" },                      // 1.35
  // La fogata está abajo en el cuadro, con copa de árbol arriba.
  { key: "fogata", at: 4, span: "col-span-1 row-span-1", pos: "50% 62%" },
  // La tabla y la parrilla forman una franja a media altura.
  { key: "fuego", at: 5, span: "col-span-1 row-span-1", pos: "50% 55%" },
  { key: "disco", at: 6, span: "col-span-1 row-span-1", pos: "50% 58%" },
  { key: "lago", at: 7, span: "col-span-2 row-span-1" },                      // 2.78
  { key: "kayak", at: 8, span: "col-span-1 row-span-1" },                     // 1.35
  { key: "costa", at: 9, span: "col-span-1 row-span-1" },                     // 1.35
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
