import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Crawlers de motores de IA: permitidos de forma explícita para que ChatGPT,
// Claude, Perplexity y Gemini puedan leer y citar el sitio.
const AI_CRAWLERS = [
  "GPTBot",          // OpenAI, entrenamiento
  "OAI-SearchBot",   // OpenAI, búsqueda en ChatGPT
  "ChatGPT-User",    // OpenAI, navegación en vivo
  "ClaudeBot",       // Anthropic
  "Claude-User",     // Anthropic, navegación en vivo
  "Claude-SearchBot",// Anthropic, búsqueda
  "PerplexityBot",   // Perplexity
  "Perplexity-User", // Perplexity, navegación en vivo
  "Google-Extended", // Gemini / Vertex
  "Applebot-Extended",
  "CCBot",           // Common Crawl
];

// Sólo lo privado. /reservas (checkout) y /mi-reserva NO van acá: tienen
// <meta robots="noindex">, y si se bloquearan el crawler no podría leer ese
// noindex. Además las rutas reales llevan idioma (/es/reservas), así que el
// "/reservas" que estaba antes no bloqueaba nada.
const PRIVATE = ["/admin", "/api"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
