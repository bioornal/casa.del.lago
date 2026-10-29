import type { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { absoluteUrl } from "@/lib/seo";
import { bucketSrc } from "@/components/ui/ImageSlot";
import { unitGalleryPhotos } from "@/lib/unit-photos";

// Rutas públicas indexables. NO incluye /reservas (checkout), /mi-reserva ni /admin.
const STATIC_PATHS = ["", "/tarifas", "/politicas/cancelacion", "/privacidad"] as const;

/** hreflang de los tres idiomas + x-default (español), igual que el <head>. */
function languagesFor(path: string) {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)])),
    "x-default": absoluteUrl(`/es${path}`),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : path === "/tarifas" ? 0.9 : 0.3,
        alternates: { languages: languagesFor(path) },
        ...(path === "" ? { images: [bucketSrc("hero/hero2.jpg")] } : {}),
      });
    }

    for (const unit of UNITS) {
      const path = `/departamentos/${unit.slug}`;
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: languagesFor(path) },
        // Todas las fotos reales de la cabaña: entran a Google Imágenes.
        images: unitGalleryPhotos(unit.slug).map((p) => bucketSrc(p.photo)),
      });
    }
  }

  return entries;
}
