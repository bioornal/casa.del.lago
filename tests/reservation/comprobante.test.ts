import { describe, it, expect } from "vitest";
import {
  MAX_BYTES, ACCEPT_ATTR, isAllowedMime, extFor, formatBytes,
} from "@/lib/reservation/comprobante";
import * as server from "@/lib/reservation/comprobante.server";

describe("reglas del comprobante", () => {
  it("acepta imágenes y PDF, rechaza el resto", () => {
    expect(isAllowedMime("image/jpeg")).toBe(true);
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("image/gif")).toBe(false);
    expect(isAllowedMime("")).toBe(false);
  });

  it("el accept del input lista los mismos tipos que valida el servidor", () => {
    // Si divergieran, el huésped elegiría un archivo que la UI acepta y el POST
    // rechaza, y el error aparecería recién al final del paso.
    for (const mime of ACCEPT_ATTR.split(",")) {
      expect(isAllowedMime(mime)).toBe(true);
    }
  });

  it("la extensión sale del mime, con fallback", () => {
    expect(extFor("image/jpeg")).toBe("jpg");
    expect(extFor("application/pdf")).toBe("pdf");
    expect(extFor("application/x-cosa")).toBe("bin");
  });

  it("el tamaño se muestra legible", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("el .server re-exporta los mismos valores: una sola fuente de verdad", () => {
    expect(server.MAX_BYTES).toBe(MAX_BYTES);
    expect(server.isAllowedMime("image/webp")).toBe(true);
  });
});
