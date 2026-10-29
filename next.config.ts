import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// Host del proyecto Supabase, para permitir sólo SUS fotos en el optimizador
// (un comodín *.supabase.co lo dejaría abierto a buckets de terceros).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "aqknzqtxhgsrhfaskoeo.supabase.co";

const nextConfig: NextConfig = {
  // Las fotos pasan por el optimizador de imágenes (en Netlify, su Image CDN):
  // se sirven al ancho de la pantalla, en AVIF/WebP, y quedan en caché del CDN.
  // Antes salían en tamaño original directo del bucket de Supabase (24,6 MB
  // las 68 fotos, sin caché) y se comían los 5 GB/mes de egress del plan
  // gratuito: Supabase ahora entrega cada foto una vez por tamaño, no por visita.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/imagenes/**" },
      // Placeholders temáticos de las fotos que todavía no están en el bucket.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
