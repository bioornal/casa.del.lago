const UNSPLASH = "https://images.unsplash.com";

// Fotos reales del lodge — bucket público "casa-lago-fotos" en Supabase Storage.
// Tienen prioridad sobre PHOTO_MAP/picsum cuando el seed coincide.
const SUPABASE_FOTOS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/casa-lago-fotos`;

/** URL pública de una foto dentro del bucket casa-lago-fotos (p. ej. "Complejo/5.jpg"). */
export function bucketSrc(path: string) {
  return `${SUPABASE_FOTOS}/${encodeURI(path)}`;
}
const REAL_PHOTOS: Record<string, string> = {
  // Cabaña Timbó — la galería del detalle usa la prop `photo` (ver UnitDetail);
  // este seed solo cubre las cards (home, tarifas, otros alojamientos).
  "cabana-timbo": "Dpto2/4.jpg", // living con sofá esquinero
  // Cabaña Lapacho — la galería del detalle usa la prop `photo` (ver UnitDetail);
  // este seed solo cubre las cards (home, tarifas, otros alojamientos).
  "cabana-lapacho": "Dpto1/20.jpg", // living con sofá y Smart TV (portada)
  // Cabaña Guatambú
  "cabana-guatambu": "Casa/18.jpg", // lateral con jardín
  "cabana-guatambu-interior": "Casa/1.jpg", // comedor
  "cabana-guatambu-dormitorio": "Casa/5.jpg", // dormitorio principal
  "cabana-guatambu-bano": "Casa/13.jpg", // baño
  "cabana-guatambu-terraza": "Casa/18.jpg", // lateral con jardín
  "cabana-guatambu-piscina": "Casa/22.jpg", // pileta con la cabaña de fondo
  "cabana-guatambu-amenities": "Casa/8.jpg", // cocina equipada
  "cabana-guatambu-living": "Casa/4.jpg", // living con TV
  "cabana-guatambu-cocina": "Casa/15.jpg", // cocina completa
  "cabana-guatambu-segundo-dormitorio": "Casa/7.jpg", // dormitorio con cuchetas
  "cabana-guatambu-comedor": "Casa/2.jpg", // comedor con ventana a la pileta
  "cabana-guatambu-estar": "Casa/3.jpg", // comedor y vajillero
  // Galería del home
  "piscina": "Casa/22.jpg",
};

// Ajustes finos por foto: filtro para tomas oscuras y objectPosition para reencuadrar
// el recorte de object-cover (x% <50 muestra más del lado izquierdo de la foto).
const PHOTO_TWEAKS: Record<string, { filter?: string; position?: string }> = {
  "Dpto2/4.jpg": {
    filter: "brightness(1.18) contrast(1.05) saturate(1.08)",
    position: "38% 58%",
  },
  // Foto vertical del balcón: la pileta y el follaje están en el tercio superior,
  // así que sesgamos el recorte hacia arriba para no mostrar solo el piso de rejilla.
  "Dpto1/22.jpg": {
    position: "50% 25%",
  },
};

const PHOTO_MAP: Record<string, { id: string; w?: number; h?: number; q?: string }> = {
  "solta-la-foto-de-portada": { id: "photo-1505881502353-a1986add3762", w: 1920, h: 1280 }, // selva amanecer
  "cabana-timbo": { id: "photo-1611892440504-42a792e24d32", w: 1200, h: 900 }, // suite madera
  "cabana-lapacho": { id: "photo-1631049307264-da0ec9d70304", w: 1200, h: 900 }, // depto moderno (fallback)
  "las-cataratas": { id: "photo-1433086966358-54859d0ed716", w: 1200, h: 1400 }, // cascada selva
  "arquitectura": { id: "photo-1517825738774-7de9363ef735", w: 1400, h: 1200 },
  "detalle": { id: "photo-1484154218962-a197022b5858", w: 1000, h: 1000 },
  "selva": { id: "photo-1448375240586-882707db888b", w: 1000, h: 1600 },
  "interior": { id: "photo-1522708323590-d24dbb6b0267", w: 1200, h: 1000 },
  "atardecer": { id: "photo-1501785888041-af3ef285b470", w: 1600, h: 1000 },
};

function toSeed(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildSrc(seed: string, w: number, h: number) {
  return `${UNSPLASH}/${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export function ImageSlot({
  label,
  className = "",
  priority = false,
  fit = "cover",
  photo,
  position,
}: {
  label: string;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  /** Ruta directa dentro del bucket casa-lago-fotos; tiene prioridad sobre el seed del label. */
  photo?: string;
  /** object-position del recorte (p. ej. "50% 20%"); pisa el tweak por foto. */
  position?: string;
}) {
  const seed = toSeed(label);
  const real = photo ?? REAL_PHOTOS[seed];
  const entry = PHOTO_MAP[seed];
  const w = entry?.w ?? 1200;
  const h = entry?.h ?? 900;
  const src = real
    ? `${SUPABASE_FOTOS}/${encodeURI(real)}`
    : entry
      ? buildSrc(entry.id, w, h)
      : `https://picsum.photos/seed/${seed}/${w}/${h}`;

  const objectClass = fit === "contain" ? "object-contain bg-stone-100" : "object-cover";
  const tweak = real ? PHOTO_TWEAKS[real] : undefined;

  return (
    <div className={`relative overflow-hidden bg-stone-100 ${className}`} aria-label={label}>
      <img
        src={src}
        alt={label}
        style={{ filter: tweak?.filter, objectPosition: position ?? tweak?.position }}
        className={`absolute inset-0 h-full w-full ${objectClass} transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)]`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
      />
    </div>
  );
}
