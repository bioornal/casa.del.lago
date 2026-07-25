import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Crawlers de motores de IA.
const AI_CRAWLERS = [
  "GPTBot",          // OpenAI, entrenamiento
  "OAI-SearchBot",   // OpenAI, búsqueda en ChatGPT
  "ChatGPT-User",    // OpenAI, navegación en vivo
  "ClaudeBot",       // Anthropic
  "Claude-User",     // Anthropic, navegación en vivo
  "PerplexityBot",   // Perplexity
  "Google-Extended", // Gemini / Vertex
  "Applebot-Extended",
  "CCBot",           // Common Crawl
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/mi-reserva"],
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: ["/admin", "/api", "/mi-reserva"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
