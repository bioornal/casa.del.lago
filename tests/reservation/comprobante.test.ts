import { describe, it, expect } from "vitest";
import {
  MAX_BYTES, isAllowedMime, extFor, formatBytes,
} from "@/lib/reservation/comprobante";
import * as server from "@/lib/reservation/comprobante.server";

describe("reglas del comprobante", () => {
  it("acepta imágenes y PDF, rechaza el resto", () => {
    expect(isAllowedMime("image/jpeg")).toBe(true);
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("image/gif")).toBe(false);
    expect(isAllowedMime("")).toBe(false);
  });

  // El test que había acá ("el accept del input lista los mismos tipos que
  // valida el servidor") era tautológico: ACCEPT_ATTR se deriva de
  // ALLOWED_MIME con un join, así que solo probaba que join+split son
  // inversos. La divergencia real cliente/servidor —que MAX_BYTES e
  // isAllowedMime sean literalmente los mismos valores en los dos módulos—
  // ya la cubre el test de más abajo. Un chequeo contra el accept del <input>
  // real, si hiciera falta, va en el test del componente (StepTransferencia),
  // no acá donde no hay DOM.

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

  it("redondea hacia arriba en MB: un byte más que el máximo no puede mostrar el mismo número que el límite", () => {
    // 6291457 B (MAX_BYTES + 1) es el valor exacto que dispara el rechazo por
    // tamaño. Con redondeo al más cercano daba "6.0 MB", y el mensaje de
    // error terminaba diciendo "pesa 6.0 MB, el máximo son 6 MB".
    expect(formatBytes(MAX_BYTES + 1)).toBe("6.1 MB");
  });

  it("no se estanca en '1024 KB': el KB redondeado que llega a 1024 pasa a mostrarse en MB", () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe("1.0 MB");
  });

  it("el .server re-exporta los mismos valores: una sola fuente de verdad", () => {
    expect(server.MAX_BYTES).toBe(MAX_BYTES);
    expect(server.isAllowedMime("image/webp")).toBe(true);
  });
});
