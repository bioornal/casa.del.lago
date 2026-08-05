// Testimonios de la home, editables desde /admin/opiniones. Viven en Supabase
// (tabla testimonials). Este módulo es la forma compartida (server + cliente +
// tests): sin imports de server, igual que lib/site-settings.ts.
//
// ⚠ ACÁ NO SE INVENTA NADA. Si no hay testimonios publicados, la sección se
// queda sólo con el puntaje agregado y el link a la ficha (ver Opiniones.tsx).
// Ese es el estado correcto mientras no haya textos reales: nunca rellenar con
// ejemplos "para ver cómo queda".
//
// LAS RESEÑAS NO SE TRADUCEN: se guardan una vez en el idioma en que fueron
// escritas y se muestran igual en las tres versiones del sitio; lo único
// traducido es el marco de la sección (messages/*.json). Traducir el testimonio
// de alguien es reescribirlo. El campo `lang` va al `lang` del <blockquote>.

export const TESTIMONIO_LANGS = ["es", "pt", "en"] as const;
export type TestimonioLang = (typeof TESTIMONIO_LANGS)[number];

export type Testimonio = {
  id: string;
  /** El nombre como figura en Google. */
  author: string;
  /** El texto tal cual lo escribió, sin comillas: las pone el componente. */
  body: string;
  lang: TestimonioLang;
  /** Las estrellas que puso el huésped, de 1 a 5. */
  rating: number;
  /** Fecha como la muestra Google: "hace 2 meses", "marzo de 2026". */
  dateLabel: string;
  /** Orden en pantalla, menor primero. */
  position: number;
  /** Despublicado = se guarda pero no se muestra. Sirve para rotarlos. */
  published: boolean;
};

export type TestimonioRow = {
  id: string;
  author?: string | null;
  body?: string | null;
  lang?: string | null;
  rating?: number | null;
  date_label?: string | null;
  position?: number | null;
  published?: boolean | null;
};

export function isTestimonioLang(v: unknown): v is TestimonioLang {
  return TESTIMONIO_LANGS.includes(v as TestimonioLang);
}

export function rowToTestimonio(row: TestimonioRow): Testimonio {
  return {
    id: row.id,
    author: (row.author ?? "").trim(),
    body: (row.body ?? "").trim(),
    lang: isTestimonioLang(row.lang) ? row.lang : "es",
    // La DB ya restringe 1–5; el clamp cubre una fila cargada a mano por SQL.
    rating: Math.min(5, Math.max(1, Math.round(Number(row.rating ?? 5)))),
    dateLabel: (row.date_label ?? "").trim(),
    position: Number(row.position ?? 0),
    published: row.published !== false,
  };
}

/** Descarta filas que no se pueden mostrar (texto o autor vacíos). */
export function isMostrable(t: Testimonio): boolean {
  return t.body.length > 0 && t.author.length > 0;
}

// ---- Validación de la entrada del formulario admin -------------------------

export type TestimonioInput = {
  author: string;
  body: string;
  lang: string;
  rating: string;
  date_label: string;
};

export type TestimonioValues = Omit<Testimonio, "id" | "position" | "published">;

/** Tope del textarea: más largo que esto desbalancea la grilla de dos columnas. */
export const BODY_MAX = 700;

export function parseTestimonioInput(
  raw: TestimonioInput,
): { ok: true; value: TestimonioValues } | { ok: false; error: string } {
  const author = raw.author.trim();
  if (!author) return { ok: false, error: "Falta el nombre de quien dejó la reseña." };

  const body = raw.body.trim();
  if (!body) return { ok: false, error: "Falta el texto de la reseña." };
  if (body.length > BODY_MAX) {
    return {
      ok: false,
      error: `El texto no puede pasar de ${BODY_MAX} caracteres (tiene ${body.length}).`,
    };
  }
  // Las comillas las agrega Opiniones.tsx; si vienen en el texto se duplican.
  if (/^["“«]/.test(body)) {
    return { ok: false, error: "Pegá el texto sin comillas: las agrega el sitio." };
  }

  if (!isTestimonioLang(raw.lang)) {
    return { ok: false, error: "Idioma inválido: esperaba 'es', 'pt' o 'en'." };
  }

  const rating = Number(raw.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Las estrellas tienen que ser un número entero del 1 al 5." };
  }

  return {
    ok: true,
    value: { author, body, lang: raw.lang, rating, dateLabel: raw.date_label.trim() },
  };
}

// ---- Agregado de la ficha de Google ----------------------------------------

/**
 * El "4,7 sobre 88" de la sección. ⚠ NO se deriva de los testimonios cargados:
 * son las reseñas que tiene la ficha en Google, no las que copiamos acá. Se
 * actualiza a mano desde el panel cuando cambia en Google.
 *
 * Vive en las columnas reviews_rating/reviews_count de site_settings (fila
 * única id=1). Se accede aparte del resto de site_settings a propósito: así
 * guardar el modo de reserva y guardar el agregado no se pisan entre sí.
 */
export type ReviewsAggregate = { rating: number; count: number };

/** Lo que muestra la ficha al 2026-08-05. Sirve si la DB no responde. */
export const DEFAULT_AGGREGATE: ReviewsAggregate = { rating: 4.7, count: 88 };

export type AggregateRow = {
  reviews_rating?: number | string | null;
  reviews_count?: number | string | null;
};

export function rowToAggregate(row: AggregateRow): ReviewsAggregate {
  // numeric(2,1) llega como string desde postgrest.
  const rating = Number(row.reviews_rating);
  const count = Number(row.reviews_count);
  return {
    rating: Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : DEFAULT_AGGREGATE.rating,
    count: Number.isInteger(count) && count >= 0 ? count : DEFAULT_AGGREGATE.count,
  };
}

export function parseAggregateInput(
  raw: { rating: string; count: string },
): { ok: true; value: ReviewsAggregate } | { ok: false; error: string } {
  // Se acepta coma o punto: en el panel se escribe "4,7" como en la ficha.
  const rating = Number(raw.rating.trim().replace(",", "."));
  if (!Number.isFinite(rating) || rating <= 0 || rating > 5) {
    return { ok: false, error: "El puntaje tiene que ser un número entre 0 y 5." };
  }
  const count = Number(raw.count.trim());
  if (!Number.isInteger(count) || count < 0) {
    return { ok: false, error: "El total de reseñas tiene que ser un número entero." };
  }
  // La columna es numeric(2,1): más decimales los redondearía la DB en silencio.
  return { ok: true, value: { rating: Math.round(rating * 10) / 10, count } };
}

/**
 * Ficha del lodge por CID. El CID sale del
 * `!1s0x94f6e519c69a41f5:0xb53bf86f8901ef7a` del embed que ya usa Contacto.tsx
 * (la segunda mitad, en hexa → decimal), así que apunta al mismo lugar que el
 * mapa y no a una búsqueda por texto, que sobre la costa del lago puede
 * resolver a otro punto.
 */
export const FICHA_URL = "https://www.google.com/maps?cid=13059304702414548858";
