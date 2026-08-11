// Reglas del comprobante de transferencia, compartidas entre cliente y servidor.
//
// Viven acá y no en comprobante.server.ts porque el selector de archivo del
// checkout es un componente cliente y tiene que validar con los MISMOS límites
// que aplica el servidor: si divergieran, el huésped subiría un archivo que la
// UI acepta y el POST rechaza, y el error aparecería recién al final del paso.
// El módulo .server re-exporta estos valores, así que la fuente de verdad sigue
// siendo única.
//
// Mismo patrón que rate-settings.ts / rate-settings.server.ts.

export const MAX_BYTES = 6 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

// Valor listo para el atributo `accept` del <input type="file">: mismos tipos
// que isAllowedMime, para que el selector nunca ofrezca algo que el POST rechaza.
export const ACCEPT_ATTR = ALLOWED_MIME.join(",");

const EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extFor(mime: string): string {
  return EXT[mime as AllowedMime] ?? "bin";
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

/** Tamaño legible para mostrar en el checkout: "512 B", "2 KB", "3.0 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
