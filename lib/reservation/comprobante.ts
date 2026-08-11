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

  // Se compara contra el KB ya redondeado, no contra el byte crudo: con el
  // byte crudo, 1048575 B (1 MB menos 1 byte) redondea a 1024 KB, un número
  // que la rama de KB nunca debería poder mostrar.
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return `${kb} KB`;

  // Redondeo hacia arriba, no al más cercano: este texto se usa en el mensaje
  // de "el archivo pesa X y el máximo son 6 MB" cuando se RECHAZA un archivo.
  // Con redondeo al más cercano, 6291457 B (un byte más que el máximo) da
  // "6.0 MB", y el mensaje termina diciendo que el archivo pesa lo mismo que
  // el límite que superó.
  const mb = Math.ceil((bytes / (1024 * 1024)) * 10) / 10;
  return `${mb.toFixed(1)} MB`;
}
