import type { Metadata } from "next";
import { bucketSrc } from "@/components/ui/ImageSlot";
import { pageAlternates } from "@/lib/seo";

export const SITE_NAME = "La Casa del Lago Urugua-í";
export const OG_LOCALE: Record<string, string> = { es: "es_AR", en: "en_US", pt: "pt_BR" };
export const DEFAULT_OG_IMAGE = { path: "hero/hero2.jpg", width: 1678, height: 937 };

/**
 * Metadatos de una página pública: título, descripción, canonical + hreflang y
 * la tarjeta para compartir (Open Graph / X). Next no fusiona openGraph entre
 * layout y página —el de la página reemplaza al del layout entero—, así que se
 * arma completo acá para que ninguna página pierda la imagen o el og:url.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  imageAlt,
  image = DEFAULT_OG_IMAGE,
  absoluteTitle = false,
}: {
  locale: string;
  /** Ruta sin el prefijo de idioma: "" para la home, "/tarifas", … */
  path: string;
  title: string;
  description: string;
  imageAlt: string;
  image?: { path: string; width?: number; height?: number };
  /** true cuando el título ya trae la marca y no lleva la plantilla del layout. */
  absoluteTitle?: boolean;
}): Metadata {
  const images = [{ url: bucketSrc(image.path), width: image.width, height: image.height, alt: imageAlt }];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: pageAlternates(locale, path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: `/${locale}${path}`,
      title,
      description,
      locale: OG_LOCALE[locale] ?? "es_AR",
      alternateLocale: Object.values(OG_LOCALE).filter((l) => l !== OG_LOCALE[locale]),
      images,
    },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
  };
}
