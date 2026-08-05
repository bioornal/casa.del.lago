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

// Las fotos que HOY están en el bucket, con su contenido. El bucket está
// organizado en carpetas: una por cabaña, una de relato (lifestyle y paisaje) y
// una de panorámicas 16:9. Ojo: los nombres de carpeta llevan espacio —
// bucketSrc() los pasa por encodeURI, que los convierte en %20.
//
// Sirve además de guarda: BUCKET_READY vale para todo el sitio, pero un número
// mal tipeado acá deja un <img> roto en vez de caer al placeholder (fue lo que
// pasó cuando el bucket se reorganizó y el código siguió pidiendo los "N.jpeg"
// sueltos de la raíz: 400 en toda la galería). Regenerar esta lista cada vez que
// se suban o borren fotos.
const BUCKET_FILES = new Set([
  // ── Cabaña Aguaribay (26 fotos; no hay 22) ──────────────────────────────
  "cab abajo/1.jpeg", // cocina-quincho con horno de ladrillo
  "cab abajo/2.jpeg", // la misma cocina, la barra y la parrilla
  "cab abajo/3.jpeg", // tabla de asado con el lago detrás (apaisada)
  "cab abajo/4.jpeg", // la pileta entre los árboles grandes
  "cab abajo/5.jpeg", // atardecer rosado desde el deck (apaisada)
  "cab abajo/6.jpeg", // mesa y sillas bajo el árbol, frente al agua
  "cab abajo/7.png", // el lago desde el jardín — 3 MB, recomprimir algún día
  "cab abajo/8.jpeg", // living con Smart TV encendida
  "cab abajo/9.jpeg", // baño, ducha con mampara y cemento alisado
  "cab abajo/10.jpeg", // living con ventana al lago (apaisada)
  "cab abajo/11.jpeg", // living con sofá grande y ventanales (apaisada)
  "cab abajo/12.jpeg", // dormitorio principal, cabecera gris
  "cab abajo/13.jpeg", // el mismo dormitorio, otro ángulo
  "cab abajo/14.jpeg", // segundo dormitorio, ventanal al lago con bruma
  "cab abajo/15.jpeg", // la parrilla exterior de ladrillo
  "cab abajo/16.jpeg", // el quincho: mesa larga frente al lago
  "cab abajo/17.jpeg", // la galería, la taza y el deck
  "cab abajo/18.jpeg", // la pileta turquesa desde el jardín
  "cab abajo/19.jpeg", // la noche: guirnaldas encendidas y pileta
  "cab abajo/20.jpeg", // deck con macetas de copetes naranjas (cuadrada)
  "cab abajo/21.jpeg", // verduras cortadas y fuego a leña
  "cab abajo/23.jpeg", // el estar, sofá y ventanas al lago
  "cab abajo/24.jpeg", // la mesa del quincho, termo y notebook
  "cab abajo/25.jpeg", // el kayak sobre las raíces (cuadrada)
  "cab abajo/26.jpeg", // la costa, la vegetación y el lago
  "cab abajo/27.jpeg", // la pileta y la cabaña, día abierto
  // ── Cabaña Aratirí (22 fotos) ───────────────────────────────────────────
  "cab arriba/1.jpeg", // living con sofá gris y comedor al fondo
  "cab arriba/2.jpeg", // cocina con mesada de granito negro
  "cab arriba/3.jpeg", // living-comedor con mesa maciza (apaisada)
  "cab arriba/4.jpeg", // comedor de mesa redonda, parrilla al fondo
  "cab arriba/5.jpeg", // el comedor con los ventanales al lago (apaisada)
  "cab arriba/6.jpeg", // living con Smart TV encendida
  "cab arriba/7.jpeg", // hall de entrada, banco y caballos de metal
  "cab arriba/8.jpeg", // dormitorio principal
  "cab arriba/9.jpeg", // segundo dormitorio
  "cab arriba/10.jpeg", // la ventana a la pileta y el lago
  "cab arriba/11.jpeg", // el deck con sillones frente a la pileta
  "cab arriba/12.jpeg", // mesa bajo los árboles con el lago detrás
  "cab arriba/13.jpeg", // la cabaña desde afuera, deck y sauces
  "cab arriba/14.jpeg", // la galería: salamandra, mate y pileta al lago
  "cab arriba/15.jpeg", // la salamandra encendida, el mate y el termo
  "cab arriba/16.jpeg", // la parrilla de ladrillo con barra y banquetas
  "cab arriba/17.jpeg", // la parrilla encendida y las verduras
  "cab arriba/18.jpeg", // el ananá en la mano, la pileta y el lago
  "cab arriba/19.jpeg", // la pileta rectangular y la cabaña, de día
  "cab arriba/20.jpeg", // la pileta desde el borde
  "cab arriba/21.jpeg", // el kayak junto al árbol
  "cab arriba/22.jpeg", // el disco al fuego bajo el cartel "Parrilla"
  // ── Relato: lifestyle y paisaje, sin cabaña identificable (17) ──────────
  "relato/3.jpeg", // kayak familiar al atardecer
  "relato/4.jpeg", // remada POV hacia el monte cerrado
  "relato/7.jpeg", // atardecer rosado, horizonte a media altura
  "relato/11.jpeg", // arboleda reflejada en el agua, luz dorada
  "relato/IMG_1265.jpeg", // mate y termo contra el lago
  "relato/IMG_1269.jpeg", // cacerola de pollo al fuego
  "relato/IMG_1270.jpeg", // fogata junto a la orilla
  "relato/IMG_1272.jpeg", // kayak y cielo rosado (la única apaisada del set)
  "relato/IMG_1275.jpeg", // calabaza a las brasas
  "relato/IMG_1276.jpeg", // el disco al fuego contra el atardecer
  "relato/IMG_1285.jpeg", // termo y mate sobre la mesa, el lago detrás
  "relato/IMG_1290.jpeg", // la costa con vegetación y el lago azul
  "relato/IMG_1291.jpeg", // kayak al atardecer, el sol bajo
  "relato/IMG_1292.jpeg", // dos personas remando de espaldas (apaisada)
  "relato/IMG_1316.jpeg", // la parrilla con la tabla de verduras
  "relato/IMG_1318.jpeg", // la costa vista desde el agua
  "relato/IMG_1319.jpeg", // dos personas mirando el lago (la más vertical)
  // ── Panorámicas 16:9 (1672×941) ─────────────────────────────────────────
  "hero/hero2.jpg", // el atardecer bajo el árbol grande — la del hero
  "hero/ChatGPT1.jpg", // el mismo lago al atardecer, extendido a 16:9
  "hero/ChatGPT2.jpg", // la misma vista pasada a día — la banda de "El lugar"
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
  // Cabañas: portadas de las cards (home, tarifas, otros alojamientos). Ahora que
  // cada cabaña tiene su carpeta, las dos van con un exterior propio: es lo que
  // las distingue de un vistazo, porque los interiores se parecen entre sí. No
  // compiten con la galería del home, que es toda de la carpeta relato/.
  "cabana-aratiri": "cab arriba/13.jpeg", // la cabaña desde afuera, deck y sauces
  "cabana-aguaribay": "cab abajo/27.jpeg", // la pileta turquesa y la cabaña
};

// Ajustes finos por foto: filtro para tomas oscuras y objectPosition para reencuadrar
// el recorte de object-cover (x% <50 muestra más del lado izquierdo de la foto).
const PHOTO_TWEAKS: Record<string, { filter?: string; position?: string }> = {
  // Nocturna: sale subexpuesta de cámara y las guirnaldas pierden el naranja.
  // El brillo va con la foto, no con la caja, así que sobrevive a cualquier tile.
  "cab abajo/19.jpeg": { filter: "brightness(1.1) contrast(1.04)" },
  // El horizonte está a media altura: centrado, cualquier recorte panorámico
  // conserva el cielo rosado y su reflejo. Es la que aguanta el tile ancho (2.78)
  // de la galería del home siendo un archivo vertical.
  "relato/7.jpeg": { position: "50% 50%" },
  // La de día va bien abajo: el protagonista es el lago, no el cielo. Con este
  // encuadre la costa cae en el tercio superior y el espejo de agua se queda con
  // los dos tercios restantes. Se pierde el sol, que está en el borde de arriba
  // de la foto, y es a propósito.
  "hero/ChatGPT2.jpg": { position: "50% 74%" },
  // De reserva: mismo encuadre que la anterior pero al atardecer. Si alguna vez
  // vuelve a la banda de "El lugar", 65% da más espejo de agua; a 80% el
  // horizonte sube demasiado y se come la nube.
  "hero/ChatGPT1.jpg": { position: "50% 65%" },
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
