import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Link } from "@/lib/i18n/navigation";
import { StickyBookingCard } from "./StickyBookingCard";
import { UNITS } from "@/lib/units";
import type { Unit, UnitSlug } from "@/lib/units";
import type { BookingMode } from "@/lib/booking-mode";

// Per-unit fixed characteristics that can't be derived purely from numbers
const UNIT_FEAT: Record<
  UnitSlug,
  { bedroom: string; bath: string; view: string; exterior: string }
> = {
  aratiri: {
    bedroom: "2 (matrimonial + twin)",
    bath: "1 completo",
    view: "Al lago",
    exterior: "Galería con parrilla + deck",
  },
  aguaribay: {
    bedroom: "1 dormitorio",
    bath: "1 completo",
    view: "Jardín y pileta",
    exterior: "Balcón con vista a la pileta",
  },
};

// Same map translated for EN / PT (static, no i18n key needed for these values)
const UNIT_FEAT_EN: Record<
  UnitSlug,
  { bedroom: string; bath: string; view: string; exterior: string }
> = {
  aratiri: { bedroom: "2 (double + twin)", bath: "1 full", view: "Lake view", exterior: "Covered deck with grill" },
  aguaribay: { bedroom: "1 bedroom", bath: "1 full", view: "Garden & pool", exterior: "Balcony overlooking the pool" },
};

const UNIT_FEAT_PT: Record<
  UnitSlug,
  { bedroom: string; bath: string; view: string; exterior: string }
> = {
  aratiri: { bedroom: "2 (casal + solteiro)", bath: "1 completo", view: "Vista para o lago", exterior: "Varanda com churrasqueira" },
  aguaribay: { bedroom: "1 quarto", bath: "1 completo", view: "Jardim e piscina", exterior: "Sacada com vista para a piscina" },
};

// Per-unit extra services appended to the shared services list, per locale.
const UNIT_EXTRAS: Record<string, Record<UnitSlug, string[]>> = {
  es: {
    aratiri: ["Dúplex con dormitorios en planta alta", "Sala de estar con sofá", "Sala comedor", "Balcón con vista a la calle", "Estacionamiento gratuito en el predio"],
    aguaribay: [],
  },
  en: {
    aratiri: ["Duplex with upstairs bedrooms", "Living room with sofa", "Dining room", "Balcony with street view", "Free on-site parking"],
    aguaribay: [],
  },
  pt: {
    aratiri: ["Duplex com quartos no andar superior", "Sala de estar com sofá", "Sala de jantar", "Sacada com vista para a rua", "Estacionamento gratuito no local"],
    aguaribay: [],
  },
};

// Galerías editoriales — todas las fotos reales del alojamiento en una
// cuadrícula asimétrica. `span` marca el tamaño: hero 2x2, wide 2x1, tall 1x2.
type GalleryPhoto = { photo: string; alt: string; span?: "hero" | "wide" | "tall" };

// Las cajas de la grilla, medidas en desktop: hero 2×2 576×436 (1.32), wide 2×1
// 576×210 (2.74), tall 1×2 280×436 (0.64) y la celda simple 280×210 (1.33) —
// que, igual que en la galería del home, NO es cuadrada sino apaisada. El set de
// cada cabaña es casi todo vertical, así que las pocas apaisadas se reservan
// para hero/wide/celda simple y el resto va a `tall`, donde el recorte es mínimo.
//
// El orden cuenta la cabaña: se entra por el estar, se recorren los dormitorios
// y el baño, después la cocina y el fuego, y se sale al deck, la pileta y el lago.

// Cabaña Aratirí — carpeta "cab arriba" del bucket (22 fotos).
const ARATIRI_PHOTOS: GalleryPhoto[] = [
  { photo: "cab arriba/3.jpeg", alt: "Living comedor con mesa de madera maciza y ventanal al deck", span: "hero" },
  { photo: "cab arriba/13.jpeg", alt: "La cabaña desde afuera, con el deck bajo los sauces" },
  { photo: "cab arriba/1.jpeg", alt: "Living con sofá y el comedor al fondo", span: "tall" },
  { photo: "cab arriba/5.jpeg", alt: "El comedor con los ventanales abiertos al lago", span: "wide" },
  { photo: "cab arriba/8.jpeg", alt: "Dormitorio principal con dos mesas de luz", span: "tall" },
  { photo: "cab arriba/9.jpeg", alt: "Segundo dormitorio con cabecera de madera", span: "tall" },
  { photo: "cab arriba/4.jpeg", alt: "Comedor de mesa redonda con la parrilla al fondo" },
  { photo: "cab arriba/2.jpeg", alt: "Cocina con mesada de granito negro", span: "tall" },
  { photo: "cab arriba/16.jpeg", alt: "La parrilla de ladrillo con barra y banquetas", span: "tall" },
  { photo: "cab arriba/17.jpeg", alt: "La parrilla encendida y las verduras sobre la mesada", span: "tall" },
  { photo: "cab arriba/22.jpeg", alt: "El disco al fuego bajo el cartel de la parrilla", span: "tall" },
  { photo: "cab arriba/14.jpeg", alt: "La galería con la salamandra y la pileta mirando al lago", span: "tall" },
  { photo: "cab arriba/15.jpeg", alt: "La salamandra encendida, el mate y el termo sobre la mesa", span: "tall" },
  { photo: "cab arriba/6.jpeg", alt: "Living con Smart TV y sofá con almohadones" },
  { photo: "cab arriba/7.jpeg", alt: "Hall de entrada con banco de madera" },
  { photo: "cab arriba/10.jpeg", alt: "La ventana que da a la pileta y al lago", span: "tall" },
  { photo: "cab arriba/11.jpeg", alt: "El deck con sillones frente a la pileta", span: "tall" },
  { photo: "cab arriba/12.jpeg", alt: "Mesa y sillas bajo los árboles, con el lago detrás", span: "tall" },
  { photo: "cab arriba/19.jpeg", alt: "La pileta y la cabaña en un día abierto", span: "tall" },
  { photo: "cab arriba/20.jpeg", alt: "La pileta vista desde el borde", span: "tall" },
  { photo: "cab arriba/18.jpeg", alt: "Un ananá en la mano, la pileta y el lago de fondo", span: "tall" },
  { photo: "cab arriba/21.jpeg", alt: "El kayak apoyado junto al árbol", span: "tall" },
];

// Cabaña Aguaribay — carpeta "cab abajo" del bucket (26 fotos: 1-21 y 23-27).
const AGUARIBAY_PHOTOS: GalleryPhoto[] = [
  { photo: "cab abajo/11.jpeg", alt: "Living con sofá grande y ventanales al lago", span: "hero" },
  { photo: "cab abajo/27.jpeg", alt: "La pileta turquesa con la cabaña entre los árboles", span: "tall" },
  { photo: "cab abajo/10.jpeg", alt: "El living con la ventana al lago" },
  { photo: "cab abajo/12.jpeg", alt: "Dormitorio principal con cabecera gris", span: "tall" },
  { photo: "cab abajo/14.jpeg", alt: "Segundo dormitorio con ventanal al lago", span: "tall" },
  { photo: "cab abajo/5.jpeg", alt: "El atardecer desde el deck, bajo el árbol grande", span: "wide" },
  { photo: "cab abajo/13.jpeg", alt: "El dormitorio principal desde la puerta", span: "tall" },
  { photo: "cab abajo/9.jpeg", alt: "Baño con ducha de mampara y paredes de cemento alisado", span: "tall" },
  { photo: "cab abajo/1.jpeg", alt: "La cocina del quincho con el horno de ladrillo" },
  { photo: "cab abajo/2.jpeg", alt: "La barra de la cocina y la parrilla" },
  { photo: "cab abajo/16.jpeg", alt: "El quincho: la mesa larga frente al lago", span: "tall" },
  { photo: "cab abajo/24.jpeg", alt: "La mesa del quincho con el termo y el mate", span: "tall" },
  { photo: "cab abajo/3.jpeg", alt: "La tabla de asado sobre la mesa, con el lago detrás" },
  { photo: "cab abajo/21.jpeg", alt: "Las verduras cortadas y el fuego a leña", span: "tall" },
  { photo: "cab abajo/15.jpeg", alt: "La parrilla exterior de ladrillo", span: "tall" },
  { photo: "cab abajo/17.jpeg", alt: "La galería con la taza sobre la mesa y el deck al frente", span: "tall" },
  { photo: "cab abajo/20.jpeg", alt: "Los copetes naranjas del deck, con el lago al fondo" },
  { photo: "cab abajo/19.jpeg", alt: "La noche, con las guirnaldas encendidas sobre la pileta", span: "tall" },
  { photo: "cab abajo/18.jpeg", alt: "La pileta turquesa vista desde el jardín", span: "tall" },
  { photo: "cab abajo/4.jpeg", alt: "La pileta a la sombra de los árboles grandes", span: "tall" },
  { photo: "cab abajo/7.png", alt: "El lago desde el jardín, con la pileta a un costado", span: "tall" },
  { photo: "cab abajo/6.jpeg", alt: "Mesa y sillas bajo el árbol, frente al agua", span: "tall" },
  { photo: "cab abajo/25.jpeg", alt: "El kayak apoyado sobre las raíces" },
  { photo: "cab abajo/26.jpeg", alt: "La costa, la vegetación en primer plano y el lago", span: "tall" },
  { photo: "cab abajo/23.jpeg", alt: "El estar, con el sofá y las ventanas al lago", span: "tall" },
  { photo: "cab abajo/8.jpeg", alt: "Living con Smart TV y mesa ratona", span: "tall" },
];

const UNIT_GALLERY: Partial<Record<UnitSlug, GalleryPhoto[]>> = {
  aratiri: ARATIRI_PHOTOS,
  aguaribay: AGUARIBAY_PHOTOS,
};

const SPAN_CLS: Record<NonNullable<GalleryPhoto["span"]>, string> = {
  hero: "col-span-2 row-span-2",
  wide: "col-span-2",
  tall: "row-span-2",
};

function useFeatValues(slug: UnitSlug, locale: string) {
  if (locale === "en") return UNIT_FEAT_EN[slug];
  if (locale === "pt") return UNIT_FEAT_PT[slug];
  return UNIT_FEAT[slug];
}

export function UnitDetail({
  unit,
  locale,
  prices,
  bookingMode,
}: {
  unit: Unit;
  locale: string;
  prices: Record<UnitSlug, number>; // tarifa de lista por noche (DB, vía getRateSettings)
  bookingMode?: BookingMode;
}) {
  const t = useTranslations("departamento");
  const tn = useTranslations("nav");
  const feat = useFeatValues(unit.slug as UnitSlug, locale);

  // The other 2 units (excluding current)
  const others = UNITS.filter((u) => u.slug !== unit.slug);

  const services = t.raw("services") as string[];
  const extras = (UNIT_EXTRAS[locale] ?? UNIT_EXTRAS.es)[unit.slug as UnitSlug];
  const allServices = [...services, ...extras];
  const gallery = UNIT_GALLERY[unit.slug as UnitSlug];

  return (
    <div className="bg-marfil text-carbon">
      {/* ===== HEADER ===== */}
      <header className="mx-auto max-w-[1320px] px-5 pt-[120px] md:px-12 md:pt-[138px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-[10px] text-[12px] uppercase tracking-[.26em] text-turquesa">
          <Link
            href="/#cabanas"
            className="text-turquesa no-underline transition-colors duration-[250ms] hover:text-atardecer"
          >
            {t("breadcrumb")}
          </Link>
          <span className="text-muted">/</span>
          <span className="text-muted">{unit.name}</span>
        </div>

        {/* H1 + subtitle + specs row */}
        <div className="mt-[22px] flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1
              className="font-display m-0 font-normal leading-[1.0] tracking-[-0.015em] text-carbon"
              style={{ fontSize: "clamp(42px,6vw,76px)" }}
            >
              {unit.name}
            </h1>
            <p
              className="font-display m-0 mt-[14px] font-light italic text-[#6b665d]"
              style={{ fontSize: "clamp(17px,2vw,23px)" }}
            >
              {t("subtitle")}
            </p>
          </div>

          {/* Specs */}
          <div className="flex items-end gap-7 md:gap-9">
            <div>
              <div className="text-[11px] uppercase tracking-[.18em] text-bronce">{t("specGuests")}</div>
              <div className="font-display mt-1 text-[26px]">{unit.specs.guests}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[.18em] text-bronce">{t("specBedroom")}</div>
              <div className="font-display mt-1 text-[26px]">{unit.specs.bedrooms}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[.18em] text-bronce">{t("specArea")}</div>
              <div className="font-display mt-1 text-[26px]">{unit.specs.area} m²</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== GALERÍA EDITORIAL ===== */}
      {gallery ? (
        /* Cuadrícula asimétrica con todas las fotos reales */
        <div>
          <section className="mx-auto max-w-[1320px] px-5 pt-8 md:px-12 md:pt-[42px]">
            <div className="grid grid-flow-dense grid-cols-2 auto-rows-[130px] gap-3 md:grid-cols-4 md:auto-rows-[210px] md:gap-4">
              {gallery.map(({ photo, alt, span }, i) => (
                <div
                  key={photo}
                  className={`overflow-hidden rounded-[4px] ${span ? SPAN_CLS[span] : ""}`}
                >
                  <ImageSlot label={alt} photo={photo} className="h-full w-full" priority={i === 0} />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
      <div>
        <section className="mx-auto max-w-[1320px] px-5 pt-8 md:px-12 md:pt-[42px]">
          {/* Top row: 2fr / 1fr */}
          <div className="grid grid-cols-1 gap-3 md:h-[560px] md:grid-cols-[2fr_1fr] md:gap-4">
            <div className="h-[280px] overflow-hidden rounded-[4px] md:h-full">
              <ImageSlot label={`${unit.name} — interior`} className="h-full w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:grid-rows-2 md:gap-4">
              <div className="h-[150px] overflow-hidden rounded-[4px] md:h-full">
                <ImageSlot label={`${unit.name} — dormitorio`} className="h-full w-full" />
              </div>
              <div className="h-[150px] overflow-hidden rounded-[4px] md:h-full">
                <ImageSlot label={`${unit.name} — baño`} className="h-full w-full" />
              </div>
            </div>
          </div>

          {/* Bottom row: 3 equal */}
          <div className="mt-3 grid h-[110px] grid-cols-3 gap-3 md:mt-4 md:h-[240px] md:gap-4">
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — terraza`} className="h-full w-full" />
            </div>
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — piscina`} className="h-full w-full" />
            </div>
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — amenities`} className="h-full w-full" />
            </div>
          </div>

          {/* Second row: 2 equal (living + cocina) */}
          <div className="mt-3 grid h-[110px] grid-cols-2 gap-3 md:mt-4 md:h-[240px] md:gap-4">
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — living`} className="h-full w-full" />
            </div>
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — cocina`} className="h-full w-full" />
            </div>
          </div>

          {/* Second dormitorio full-width para recorte sutil */}
          <div className="mt-3 grid h-[180px] grid-cols-1 gap-3 md:mt-4 md:h-[300px] md:gap-4">
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — segundo dormitorio`} className="h-full w-full" />
            </div>
          </div>

          {/* Third row: 1fr / 2fr */}
          <div className="mt-3 grid grid-cols-1 gap-3 md:mt-4 md:h-[420px] md:grid-cols-[1fr_2fr] md:gap-4">
            <div className="h-[280px] overflow-hidden rounded-[4px] md:h-full">
              <ImageSlot label={`${unit.name} — comedor`} className="h-full w-full" />
            </div>
            <div className="h-[280px] overflow-hidden rounded-[4px] md:h-full">
              <ImageSlot label={`${unit.name} — estar`} className="h-full w-full" />
            </div>
          </div>
        </section>
      </div>
      )}

      {/* ===== CONTENIDO + RESERVA ===== */}
      <section className="mx-auto max-w-[1320px] px-5 pb-16 pt-14 md:px-12 md:pb-[110px] md:pt-24">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.55fr_1fr] lg:gap-[72px]">

          {/* LEFT — editorial + características + servicios */}
          <div>
            {/* El espacio */}
            <div>
              <Kicker>{t("spaceTitle")}</Kicker>
              <p
                className="font-display m-0 mt-[22px] font-light leading-[1.45] text-[#3a3429]"
                style={{ fontSize: "clamp(22px,2.5vw,30px)" }}
              >
                {t(`spaceBody.${unit.slug}`)}
              </p>
            </div>

            {/* Características */}
            <div>
              <div className="mt-16">
                <Kicker className="mb-7 block">{t("featuresTitle")}</Kicker>
                <div
                  className="grid grid-cols-1 gap-[1px] overflow-hidden rounded-[4px] border border-borde-claro sm:grid-cols-2"
                  style={{ background: "#E2DACE" }}
                >
                  {[
                    { label: t("featCapacity"), value: `${unit.specs.guests} ${t("specGuests").toLowerCase()}` },
                    { label: t("featBedroom"), value: feat.bedroom },
                    { label: t("featBath"), value: feat.bath },
                    { label: t("featView"), value: feat.view },
                    { label: t("featArea"), value: `${unit.specs.area} m²` },
                    { label: t("featExterior"), value: feat.exterior },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-marfil px-6 py-[22px]">
                      <div className="text-[12px] tracking-[.04em] text-bronce">{label}</div>
                      <div className="font-display mt-[6px] text-[22px] text-carbon">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Servicios */}
            <div>
              <div className="mt-16">
                <Kicker className="mb-7 block">{t("servicesTitle")}</Kicker>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-12">
                  {allServices.map((s: string) => (
                    <div
                      key={s}
                      className="flex items-center gap-[13px] border-b border-[#E7E0D4] pb-[15px]"
                    >
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-terracota" />
                      <span className="text-[15px] text-[#3a3429]">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — sticky booking card */}
          <StickyBookingCard unit={unit} price={prices[unit.slug]} bookingMode={bookingMode} />
        </div>
      </section>

      {/* ===== OTROS ALOJAMIENTOS ===== */}
      <section className="bg-arena-clara py-16 md:py-[110px]">
        <div className="mx-auto max-w-[1320px] px-5 md:px-12">
          <div>
            <div className="mb-[52px] flex flex-wrap items-end justify-between gap-5">
              <h2
                className="font-display m-0 font-normal tracking-[-0.01em] text-carbon"
                style={{ fontSize: "clamp(28px,3.6vw,46px)" }}
              >
                {t("otherTitle")}
              </h2>
              <Link
                href="/#cabanas"
                className="inline-flex items-center gap-[9px] border-b border-[#c9bfae] pb-[5px] text-[13px] uppercase tracking-[.08em] text-carbon no-underline transition-[gap] duration-300 hover:gap-[16px]"
              >
                {tn("apartments")} →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-[30px]">
            {others.map((other, i) => (
              <div>
                <Link
                  href={`/departamentos/${other.slug}`}
                  className="block text-inherit no-underline transition-transform duration-500 ease-[cubic-bezier(.16,.84,.44,1)] hover:-translate-y-2"
                >
                  <div className="overflow-hidden rounded-[3px] bg-slot">
                    <ImageSlot label={other.name} className="h-[240px] w-full md:h-[360px]" />
                  </div>
                  <div className="mt-[18px] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display m-0 font-medium text-[26px] text-carbon">
                      {other.name}
                    </h3>
                    <span className="text-[13px] text-bronce">
                      ${new Intl.NumberFormat("es-AR").format(prices[other.slug])} {t("perNight")}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
