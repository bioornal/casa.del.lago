// Fuente de verdad de la URL pública del sitio.
//
// Todo lo que emite URLs absolutas —canonical, hreflang, sitemap, OG, JSON-LD—
// pasa por acá. El día que se conecte un dominio propio es cambiar
// NEXT_PUBLIC_SITE_URL en Netlify y redeployar: cero cambios de código.

const FALLBACK = "https://lacasadellagouruguai.com";

function normalize(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (v === "") return FALLBACK;
  return v.replace(/\/+$/, "");
}

export const SITE_URL = normalize(process.env.NEXT_PUBLIC_SITE_URL);

/** URL absoluta a partir de un path del sitio. `/` devuelve la raíz sin barra. */
export function absoluteUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return clean === "" ? SITE_URL : `${SITE_URL}/${clean}`;
}

const LOCALES = ["es", "en", "pt"] as const;

/**
 * Canonical + hreflang de una página, para `metadata.alternates`. Las rutas son
 * relativas: el layout fija `metadataBase` = SITE_URL y Next las vuelve
 * absolutas (Google ignora un hreflang relativo). `x-default` apunta al español,
 * el idioma principal del sitio. El canonical también saca los parámetros de
 * búsqueda (?checkIn=…) de /tarifas, que si no se indexarían como duplicados.
 */
export function pageAlternates(locale: string, path: string) {
  const languages = Object.fromEntries(LOCALES.map((l) => [l, `/${l}${path}`])) as Record<
    (typeof LOCALES)[number] | "x-default",
    string
  >;
  languages["x-default"] = `/es${path}`;
  return { canonical: `/${locale}${path}`, languages };
}
