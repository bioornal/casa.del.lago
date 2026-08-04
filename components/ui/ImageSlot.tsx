const UNSPLASH = "https://images.unsplash.com";

// Fotos reales del lodge — bucket público "imagenes" en Supabase Storage.
// Tienen prioridad sobre PHOTO_MAP/placeholders cuando el seed coincide.
const SUPABASE_FOTOS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imagenes`;

// ¿Bucket propio cargado? Opt-in explícito: hasta que el bucket tenga las fotos
// subidas, todo cae a placeholders temáticos (lago/cabañas/selva). Antes esto se
// deducía de que NEXT_PUBLIC_SUPABASE_URL siguiera siendo la plantilla
// ("TU-PROYECTO"), pero configurar el proyecto Supabase y subir las fotos son dos
// pasos distintos: la heurística rompía todas las imágenes en el medio.
const BUCKET_READY =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_PHOTOS_BUCKET_READY === "1";

// Las fotos que HOY están en el bucket, con su contenido. El bucket es plano:
// archivos "N.jpeg" sueltos, sin carpetas por alojamiento.
//
// Sirve además de guarda: BUCKET_READY vale para todo el sitio, pero las galerías
// de Aratirí/Aguaribay (ver UnitDetail) siguen apuntando a rutas "Dpto1/…"/"Dpto2/…"
// heredadas de otro proyecto que nunca existieron acá. Sin esta lista quedarían
// 42 <img> rotos en vez de caer al placeholder. Cuando se suban las fotos de cada
// cabaña, agregarlas acá y actualizar UnitDetail.
const BUCKET_FILES = new Set([
  "1.jpeg", // living con sofá esquinero, ventanas al lago
  "3.jpeg", // kayak familiar al atardecer
  "4.jpeg", // remada POV hacia el monte
  "5.jpeg", // el complejo de noche, guirnaldas y pileta
  "6.jpeg", // verduras cortadas y fuego a leña
  "7.jpeg", // atardecer sobre el lago, reflejo rosado
  "9.jpeg", // pileta turquesa con la cabaña entre los árboles
  "10.jpeg", // dormitorio con ventanal al lago (bruma)
  "11.jpeg", // el complejo visto desde el agua, luz dorada
  "12.jpeg", // dormitorio, cabecera gris
  "13.jpeg", // dormitorio, toma frontal
  "14.jpeg", // pileta + lago + arboleda (la única apaisada del set)
  "16.jpeg", // galería con taza de café y vista al lago
  "17.jpeg", // el quincho: mesa larga, mate y termo frente al lago
  "18.jpeg", // kayak apoyado sobre las raíces
  "19.jpeg", // deck con macetas de copetes naranjas
  "20.jpeg", // dormitorio con ventanal, encuadre cuadrado
  "21.jpeg", // pileta y cabaña, día abierto
  "22.jpeg", // vegetación en primer plano, pileta y lago al fondo
  // Versión 16:9 del atardecer de la 7, extendida con IA. Es la única del bucket
  // con formato apaisado real, por eso va en la banda panorámica de "El lugar".
  // (Su hermana ChatGPT2.jpg es la misma vista pasada a día, hoy sin usar.)
  "ChatGPT1.jpg",
  // Fuera del set a propósito: la 2, porque el Smart TV está encendido con un
  // noticiero y la placa se lee a tamaño real. La 8 queda afuera por repetida:
  // es la misma escena que la 17, que sí entra.
  // La 15 nunca se subió al bucket.
]);

/** URL pública de una foto dentro del bucket imagenes (p. ej. "14.jpeg"). */
export function bucketSrc(path: string) {
  return `${SUPABASE_FOTOS}/${encodeURI(path)}`;
}

/** ¿Esta ruta se puede servir del bucket, o hay que caer al placeholder? */
function inBucket(path: string | undefined): path is string {
  return BUCKET_READY && !!path && BUCKET_FILES.has(path);
}

const REAL_PHOTOS: Record<string, string> = {
  // Cabañas: portadas de las cards (home, tarifas, otros alojamientos). Hasta que
  // haya fotos de cada cabaña por separado, las dos van con interiores genéricos.
  // Elegidas para NO repetir ninguna de las diez de la galería del home: las
  // cards y la grilla conviven en la misma página y la repetición se nota.
  "cabana-aratiri": "10.jpeg", // dormitorio con ventanal al lago
  "cabana-aguaribay": "12.jpeg", // dormitorio con cabecera gris
  // Galería del home
  "piscina": "21.jpeg",
};

// Ajustes finos por foto: filtro para tomas oscuras y objectPosition para reencuadrar
// el recorte de object-cover (x% <50 muestra más del lado izquierdo de la foto).
const PHOTO_TWEAKS: Record<string, { filter?: string; position?: string }> = {
  // Tomada al amanecer con bruma: sale plana y fría de cámara.
  "1.jpeg": {
    filter: "brightness(1.12) contrast(1.06) saturate(1.06)",
    position: "50% 55%",
  },
  // Nocturna: las cabañas iluminadas están en la mitad superior, la pileta en
  // sombra ocupa el tercio de abajo. Sesgamos el recorte hacia arriba.
  "5.jpeg": {
    filter: "brightness(1.1) contrast(1.04)",
    position: "50% 32%",
  },
  // Remada en primera persona. El recorte va bien arriba a propósito: manda el
  // monte cerrándose sobre el agua y quien rema baja al tercio inferior, con el
  // tatuaje y el logo de la remera fuera de cuadro. Probado contra 20% y 35%,
  // que dejaban la espalda dominando la foto — no bajar de 10%.
  "4.jpeg": { position: "50% 10%" },
  // El horizonte está a media altura: centrado, cualquier recorte panorámico
  // conserva el cielo rosado y su reflejo. (Hoy sin usar: la banda de "El lugar"
  // pasó a ChatGPT1.jpg, que es esta misma toma ya en 16:9.)
  "7.jpeg": { position: "50% 50%" },
  // El quincho: la franja que importa es la mesa larga con el lago detrás del
  // vidrio. Centrado, el recorte se queda con eso y deja fuera el techo.
  "17.jpeg": { position: "50% 52%" },
  // Banda de "El lugar". En 16:9 dentro de una caja ~2.6 se ve el 69% del alto,
  // así que el encuadre elige qué se pierde. Bajado a 65% para dar más espejo de
  // agua; a 80% el horizonte sube demasiado y se come la nube del atardecer.
  "ChatGPT1.jpg": { position: "50% 65%" },
  // Vertical con mucho cielo: las cabañas y el reflejo viven en la banda central.
  "11.jpeg": { position: "50% 48%" },
};

const PHOTO_MAP: Record<string, { id: string; w?: number; h?: number; q?: string }> = {
  "solta-la-foto-de-portada": { id: "photo-1505881502353-a1986add3762", w: 1920, h: 1280 }, // selva amanecer
  "cabana-aratiri": { id: "photo-1611892440504-42a792e24d32", w: 1200, h: 900 }, // suite madera
  "cabana-aguaribay": { id: "photo-1631049307264-da0ec9d70304", w: 1200, h: 900 }, // depto moderno (fallback)
  "las-cataratas": { id: "photo-1433086966358-54859d0ed716", w: 1200, h: 1400 }, // cascada selva
  "arquitectura": { id: "photo-1517825738774-7de9363ef735", w: 1400, h: 1200 },
  "detalle": { id: "photo-1484154218962-a197022b5858", w: 1000, h: 1000 },
  "selva": { id: "photo-1448375240586-882707db888b", w: 1000, h: 1600 },
  "interior": { id: "photo-1522708323590-d24dbb6b0267", w: 1200, h: 1000 },
  "atardecer": { id: "photo-1501785888041-af3ef285b470", w: 1600, h: 1000 },
};

// Placeholders tem\u00e1ticos (ids verificados) \u2014 pertinentes al entorno del lago
// hasta que est\u00e9n las fotos propias. Elegidos por keyword del seed + hash
// determin\u00edstico, as\u00ed cada slot mantiene siempre la misma foto.
const POOL = {
  lago: [
    "photo-1506744038136-46273834b3fb", // lago a la hora dorada
    "photo-1501785888041-af3ef285b470", // atardecer sobre el agua
    "photo-1499002238440-d264edd596ec", // costa al atardecer
  ],
  cabana: [
    "photo-1518780664697-55e3ad937233", // caba\u00f1a junto al lago
    "photo-1449158743715-0a90ebb6d2d8", // casa entre \u00e1rboles
    "photo-1510798831971-661eb04b3739", // caba\u00f1a A-frame
  ],
  selva: [
    "photo-1441974231531-c6227db76b6e", // sendero de bosque
    "photo-1518495973542-4542c06a5843", // luz entre hojas
    "photo-1490750967868-88aa4486c946", // flores
  ],
  interior: [
    "photo-1505693416388-ac5ce068fe85", // dormitorio
    "photo-1522708323590-d24dbb6b0267", // living
    "photo-1556911220-bff31c812dba",    // cocina
    "photo-1552321554-5fefe8c9ef14",    // ba\u00f1o
  ],
  pileta: ["photo-1540541338287-41700207dee6"], // pileta al atardecer
  cascada: ["photo-1433086966358-54859d0ed716"], // cascada en la selva
};

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function themedId(seed: string): string {
  const pick = (arr: string[]) => arr[hashSeed(seed) % arr.length];
  if (/cascada|catarata/.test(seed)) return pick(POOL.cascada);
  if (/pileta|piscina/.test(seed)) return pick(POOL.pileta);
  if (/dormitorio|descanso|cama|suite|bano|cocina|comedor|living|estar|interior|adentro|rincon|detalle|vajillero|bacha|espejo|placard/.test(seed))
    return pick(POOL.interior);
  if (/selva|jardin|flor|iris|heliconia|orquidea|arce|hoja|descenso|sendero/.test(seed))
    return pick(POOL.selva);
  if (/refugio|cabana|casa|galeria|balcon|terraza|frente|lateral/.test(seed))
    return pick(POOL.cabana);
  if (/agua|lago|muelle|kayak|atardecer|llegada|costa/.test(seed)) return pick(POOL.lago);
  const all = [...POOL.lago, ...POOL.cabana, ...POOL.selva];
  return all[hashSeed(seed) % all.length];
}

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

/** Resuelve el src de una foto por label/ruta: bucket propio si est\u00e1 configurado,
 *  placeholder tem\u00e1tico si no. Lo usa tambi\u00e9n el lightbox de la galer\u00eda. */
export function slotSrc(label: string, photo?: string, w = 1600, h = 1100) {
  const seed = toSeed(label);
  const real = photo ?? REAL_PHOTOS[seed];
  if (inBucket(real)) return bucketSrc(real);
  const entry = PHOTO_MAP[seed];
  return buildSrc(entry?.id ?? themedId(seed), w, h);
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
  /** Ruta directa dentro del bucket imagenes; tiene prioridad sobre el seed del label. */
  photo?: string;
  /** object-position del recorte (p. ej. "50% 20%"); pisa el tweak por foto. */
  position?: string;
}) {
  const seed = toSeed(label);
  const real = photo ?? REAL_PHOTOS[seed];
  const entry = PHOTO_MAP[seed];
  const w = entry?.w ?? 1200;
  const h = entry?.h ?? 900;
  const fromBucket = inBucket(real);
  const src = fromBucket ? bucketSrc(real) : buildSrc(entry?.id ?? themedId(seed), w, h);

  const objectClass = fit === "contain" ? "object-contain bg-stone-100" : "object-cover";
  const tweak = fromBucket ? PHOTO_TWEAKS[real] : undefined;

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
