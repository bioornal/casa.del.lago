import crypto from "node:crypto";
import { getServiceClient } from "@/lib/supabase/server";
import { extFor } from "./comprobante";

const BUCKET = "comprobantes";

// Los límites y la validación viven en comprobante.ts (client-safe) porque el
// checkout los necesita del lado del cliente también. Re-exportados acá para
// que los importadores actuales de este módulo no cambien.
export { MAX_BYTES, ALLOWED_MIME, extFor, isAllowedMime } from "./comprobante";
export type { AllowedMime } from "./comprobante";

/** Sube el archivo a comprobantes/<code>/<uuid>.<ext>. Devuelve el path. Lanza si falla. */
export async function uploadComprobante(code: string, file: File): Promise<string> {
  const ext = extFor(file.type);
  const path = `${code}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await getServiceClient()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error(`uploadComprobante: ${error.message}`);
  return path;
}

/** Borra un comprobante (best-effort; no lanza). */
export async function removeComprobante(path: string): Promise<void> {
  try {
    await getServiceClient().storage.from(BUCKET).remove([path]);
  } catch {
    /* best-effort */
  }
}

/** Signed URL de corta duración (300s) para mostrar el comprobante en el panel. */
export async function signComprobanteUrl(path: string): Promise<string | null> {
  const { data, error } = await getServiceClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data) return null;
  return data.signedUrl;
}
